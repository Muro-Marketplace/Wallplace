import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter using fixed windows keyed on IP.
 * Suitable for launch scale. Resets on server restart.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 10000;

// Periodic cleanup every 60s
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
  // LRU-style eviction if too many entries
  if (store.size > MAX_ENTRIES) {
    const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toDelete = entries.slice(0, store.size - MAX_ENTRIES);
    for (const [key] of toDelete) store.delete(key);
  }
}

function getIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Check rate limit for a request.
 * Returns null if allowed, or a 429 NextResponse if blocked.
 */
export function checkRateLimit(
  request: Request,
  limit: number,
  windowMs: number = 60000
): NextResponse | null {
  cleanup();

  const ip = getIP(request);
  const key = `${ip}:${request.url}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return null;
}
