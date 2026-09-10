/**
 * Carry a signup's marketing choice into `email_preferences`.
 *
 * The problem this solves is a hop, not a write. The signup form knows the
 * user's answer, but at that moment there is no session: `supabase.auth.signUp`
 * has returned and email confirmation has not happened, so nothing the client
 * says about a preference can be trusted. A pre-auth endpoint that accepted
 * "set marketing = true for this email address" would let anyone opt anyone
 * else in, which is the precise harm PECR reg 22 exists to prevent.
 *
 * So the answer travels on `signUp(options.data)`, which GoTrue writes to the
 * new account's own `user_metadata`. That channel is safe for this purpose:
 * a third party cannot write metadata onto someone else's account, and the
 * account holder writing their own preference is exactly what they are
 * entitled to do.
 *
 * It is materialised here on the first authenticated request after sign-in,
 * from the verified token, by /api/auth/welcome.
 *
 * Idempotency and the opt-out trap: this writes ONLY when the user has no
 * `email_preferences` row yet. Once the row exists it is authoritative, so a
 * user who later opts out in the preference centre is not silently re-opted-in
 * on their next sign-in by metadata that still says true.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type MarketingConsentOutcome =
  | "created"
  | "already_recorded"
  | "no_choice_recorded"
  | "failed";

/** Did this account's signup record an affirmative marketing opt-in? */
export function signupOptedIntoMarketing(user: Pick<User, "user_metadata">): boolean {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return meta.marketing_opt_in === true;
}

export async function materialiseMarketingConsent(
  user: Pick<User, "id" | "user_metadata">,
  client?: SupabaseClient,
): Promise<MarketingConsentOutcome> {
  const db = client ?? getSupabaseAdmin();

  const { data: existing, error: readErr } = await db
    .from("email_preferences")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readErr) {
    console.error("[marketing-consent] preference lookup failed:", readErr.message);
    return "failed";
  }
  // The row is the record of choice from here on. Never overwrite it.
  if (existing) return "already_recorded";

  const optedIn = signupOptedIntoMarketing(user);

  // No row and no opt-in means there is nothing to record: the defaults in
  // migration 141 are already "no", and send.ts treats a missing row as
  // absence of consent, so writing a row of falses would change nothing.
  if (!optedIn) return "no_choice_recorded";

  const { error: writeErr } = await db.from("email_preferences").insert({
    user_id: user.id,
    tips_enabled: true,
    recommendations_enabled: true,
  });

  if (writeErr) {
    // A concurrent request created the row between the read and the write.
    // That is the same outcome, reached by another path.
    if ((writeErr as { code?: string }).code === "23505") return "already_recorded";
    console.error("[marketing-consent] could not record consent:", writeErr.message);
    return "failed";
  }

  return "created";
}
