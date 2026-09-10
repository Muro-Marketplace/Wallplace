// POST /api/auth/welcome
//
// Idempotent welcome-email trigger. Safe to call on every login, the
// underlying triggerWelcomeIfNeeded() short-circuits after the first
// successful send (artist/venue: welcomed_at column; customer:
// sendEmail's idempotency_key on `welcome:${userId}`).
//
// Called from:
//   - /auth/callback (OAuth flow)
//   - AuthContext on SIGNED_IN  (covers email/password verification)
//
// It is also where a signup's marketing choice becomes an email_preferences
// row. That cannot happen at signup, because there is no session yet and a
// pre-auth "set marketing = true for this address" endpoint would let anyone
// opt anyone else in. The choice rides on the new account's own user_metadata
// and is materialised here from the VERIFIED token. See lib/email/
// marketing-consent.ts for why it only ever writes when no row exists.
//
// Fire-and-forget from clients: returns 200 even if the send was
// suppressed/throttled. Hard errors come back as 4xx/5xx so dev tools
// surface them in the console.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { triggerWelcomeIfNeeded } from "@/lib/email/welcome";
import { materialiseMarketingConsent } from "@/lib/email/marketing-consent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: userResp, error } = await getSupabaseAdmin().auth.getUser(token);
  const user = userResp?.user;
  if (error || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Before the welcome mail, not after: the welcome itself is a service
  // message and sends either way, but any news-stream mail that follows in the
  // same session should see the preference the user actually chose. Failures
  // are logged inside and never block the response; a missing preference row
  // means no marketing, which is the safe direction to fail in.
  await materialiseMarketingConsent(user);

  const result = await triggerWelcomeIfNeeded(user.id);
  if (!result.ok) {
    // 502 because the failure is a downstream issue (template render or
    // mail provider), not the client's fault.
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json(result);
}
