// HMAC-signed token included in order confirmation emails. Lets the
// /track endpoint and /refund endpoint verify the buyer holds a real
// link instead of trusting bare email match. Default TTL 90 days
// (orders take a while to ship + delivery + return windows).

import { createHmac, timingSafeEqual } from "node:crypto";

interface Payload {
  orderId: string;
  email: string;
  iat: number;
}

const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60;

function getSecret(): string {
  const s = process.env.ORDER_TOKEN_SECRET;
  if (!s) throw new Error("ORDER_TOKEN_SECRET is not configured");
  return s;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded + "=".repeat((4 - (padded.length % 4)) % 4), "base64");
}

export interface SignOptions {
  ttlSeconds?: number;
}

export async function signOrderToken(
  data: { orderId: string; email: string },
  opts: SignOptions = {},
): Promise<string> {
  const secret = getSecret();
  const payload: Payload = {
    orderId: data.orderId,
    email: data.email.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = base64url(JSON.stringify(payload));
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = payload.iat + ttl;
  const signed = `${encoded}.${expiresAt}`;
  const sig = base64url(createHmac("sha256", secret).update(signed).digest());
  return `${signed}.${sig}`;
}

export async function verifyOrderToken(
  token: string,
): Promise<{ orderId: string; email: string }> {
  const secret = getSecret();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [encoded, expiresAtStr, sig] = parts;
  const expiresAt = Number.parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt)) throw new Error("Malformed token");
  const expectedSig = base64url(
    createHmac("sha256", secret).update(`${encoded}.${expiresAtStr}`).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid signature");
  }
  if (Math.floor(Date.now() / 1000) > expiresAt) {
    throw new Error("Token expired");
  }
  const payloadJson = fromBase64url(encoded).toString();
  const payload = JSON.parse(payloadJson) as { orderId: unknown; email: unknown };
  if (typeof payload.orderId !== "string") throw new Error("Bad orderId");
  if (typeof payload.email !== "string") throw new Error("Bad email");
  return { orderId: payload.orderId, email: payload.email };
}
