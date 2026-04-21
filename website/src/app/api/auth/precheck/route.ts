import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// F54: IP-scoped rate limit for auth attempts. Cloudflare edge rules are the
// primary line of defence; this in-app fallback catches abuse that slips past.
// The client calls this before running supabase.auth.signInWithPassword or
// supabase.auth.resetPasswordForEmail so we never let a bot brute-force either.
//
// Expected body: { kind: "login" | "forgot-password" }
export async function POST(request: Request) {
  let body: { kind?: string } = {};
  try { body = await request.json(); } catch { /* empty body is fine */ }

  const kind = body.kind === "forgot-password" ? "forgot-password" : "login";

  // Tighter limit on forgot-password because each request triggers an email.
  // login: 8 per minute per IP.
  // forgot-password: 3 per 5 minutes per IP.
  const blocked = kind === "forgot-password"
    ? checkRateLimit(request, 3, 5 * 60_000)
    : checkRateLimit(request, 8, 60_000);

  if (blocked) return blocked;

  return NextResponse.json({ ok: true });
}
