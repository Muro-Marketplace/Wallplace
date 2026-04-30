// Unified artist outreach cap. Caps NEW venue contact per calendar day
// across all surfaces: placement requests, first-contact messages, and
// artwork-request responses. Replies inside an existing thread or
// counter-offers on existing placements don't count.
//
// Plans:
//   core    → 2/day
//   premium → 5/day
//   pro     → 10/day
//   (`-1` sentinel = unlimited, reserved for staff)
//
// Callers pass the kind of outreach they're about to make plus the
// number of units (e.g. multi-work placement request counts as N).

import type { SupabaseClient } from "@supabase/supabase-js";

const DAILY_LIMITS: Record<string, number> = {
  core: 2,
  premium: 5,
  pro: 10,
};

export type OutreachKind = "placement_request" | "first_contact_message" | "artwork_request_response";

export interface OutreachCapResult {
  allowed: boolean;
  plan: string;
  limit: number;
  used: number;
  /** Status code to return if disallowed. Always 429. */
  status: 429;
  /** Human-readable message safe to surface in UI. */
  message: string;
}

export async function checkArtistOutreachCap(
  db: SupabaseClient,
  artistUserId: string,
  units = 1,
): Promise<{ ok: true } | { ok: false; result: OutreachCapResult }> {
  const planRow = await db
    .from("artist_profiles")
    .select("subscription_plan")
    .eq("user_id", artistUserId)
    .single();
  const planKey = ((planRow.data as { subscription_plan?: string | null } | null)?.subscription_plan || "core").toLowerCase();
  const limit = DAILY_LIMITS[planKey] ?? DAILY_LIMITS.core;
  if (limit === -1) return { ok: true };

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const since = dayStart.toISOString();

  // Sum across the three surfaces.
  const [placements, conversations, responses] = await Promise.all([
    db
      .from("placements")
      .select("id", { count: "exact", head: true })
      .eq("requester_user_id", artistUserId)
      .gte("created_at", since),
    db
      .from("messages")
      .select("conversation_id, created_at")
      .eq("sender_id", artistUserId)
      .gte("created_at", since),
    db
      .from("artwork_request_responses")
      .select("id", { count: "exact", head: true })
      .eq("artist_user_id", artistUserId)
      .gte("created_at", since),
  ]);

  const placementCount = placements.count || 0;
  const responseCount = responses.count || 0;
  // De-duplicate first-contact messages by conversation_id (multiple
  // messages in the same new thread = one outreach unit).
  const conversationsToday = new Set<string>();
  for (const r of (conversations.data || []) as Array<{ conversation_id: string | null }>) {
    if (r.conversation_id) conversationsToday.add(r.conversation_id);
  }
  const messageCount = conversationsToday.size;

  const used = placementCount + messageCount + responseCount;
  if (used + units > limit) {
    const planName = planKey === "premium" ? "Premium" : planKey === "pro" ? "Pro" : "Core";
    return {
      ok: false,
      result: {
        allowed: false,
        plan: planKey,
        limit,
        used,
        status: 429,
        message:
          `Your ${planName} plan allows ${limit} new venue outreach${limit === 1 ? "" : "es"} per day across placements, messages, and request responses. ` +
          `Try again tomorrow, or upgrade your plan to reach more venues.`,
      },
    };
  }

  return { ok: true };
}
