// HMAC-signed OAuth state. The `state` query param is what providers
// like Google round-trip back to /auth/callback. We stash the signup
// role + return path inside it so the callback can't be lied to about
// what role the user originally chose.

import { createHmac, timingSafeEqual } from "node:crypto";
import { isRole, type UserRole } from "./auth-roles";

interface Payload {
  role: UserRole;
  next: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
}

const DEFAULT_TTL_SECONDS = 15 * 60;

function getSecret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s) throw new Error("OAUTH_STATE_SECRET is not configured");
  return s;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded + "=".repeat((4 - (padded.length % 4)) % 4), "base64");
}

export interface SignOptions {
  ttlSeconds?: number;
}

export async function signOAuthState(
  data: { role: UserRole; next: string },
  opts: SignOptions = {},
): Promise<string> {
  const secret = getSecret();
  const payload: Payload = {
    role: data.role,
    next: data.next,
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = base64url(JSON.stringify(payload));
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = payload.iat + ttl;
  const signed = `${encoded}.${expiresAt}`;
  const sig = base64url(createHmac("sha256", secret).update(signed).digest());
  return `${signed}.${sig}`;
}

export async function verifyOAuthState(token: string): Promise<{ role: UserRole; next: string }> {
  const secret = getSecret();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed state");
  const [encoded, expiresAtStr, sig] = parts;
  const expiresAt = Number.parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt)) throw new Error("Malformed state");

  const expectedSig = base64url(
    createHmac("sha256", secret).update(`${encoded}.${expiresAtStr}`).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid signature");
  }
  if (Math.floor(Date.now() / 1000) > expiresAt) {
    throw new Error("State expired");
  }

  const payloadJson = fromBase64url(encoded).toString();
  const payload = JSON.parse(payloadJson) as { role: unknown; next: unknown };
  if (!isRole(payload.role)) throw new Error("Bad role in state");
  if (typeof payload.next !== "string") throw new Error("Bad next in state");
  return { role: payload.role, next: payload.next };
}
