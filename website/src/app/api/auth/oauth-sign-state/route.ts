// POST /api/auth/oauth-sign-state
//
// Mints a signed state token the OAuth flow round-trips back to
// /auth/callback. Keeps the OAUTH_STATE_SECRET server-side and is the
// only entry point for state creation.

import { NextResponse } from "next/server";
import { signOAuthState } from "@/lib/oauth-state";
import { isRole } from "@/lib/auth-roles";
import { safeRedirect } from "@/lib/safe-redirect";

export async function POST(request: Request) {
  let body: { role?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const next = safeRedirect(body.next, "/browse");
  const state = await signOAuthState({ role: body.role, next }).catch(() => null);
  if (!state) {
    return NextResponse.json({ error: "OAuth not configured" }, { status: 503 });
  }
  return NextResponse.json({ state });
}
