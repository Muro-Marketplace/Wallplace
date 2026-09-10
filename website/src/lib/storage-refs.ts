/**
 * One place that knows the shape of a Supabase Storage object reference.
 *
 * Migration 140 made `message-attachments` and `wall-renders` private, so the
 * `getPublicUrl()` values already stored in `messages.attachments[].url` no
 * longer resolve. Rather than rewrite historical rows, the readers parse the
 * object path back out of whatever is stored and sign it on demand. That also
 * means a future bucket rename needs one edit here rather than a migration
 * over user data.
 *
 * Two shapes are understood:
 *   - a public URL, `https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>`
 *   - a bare path, `<uuid>/<file>` as written by src/lib/upload.ts
 *
 * A signed URL for the same object is `.../object/sign/<bucket>/<path>?token=…`,
 * so that form is accepted too: re-signing an already-signed value is harmless
 * and stops a stale link in a client's state from becoming a hard error.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * How long a signed read link lives. Long enough for a conversation or an
 * editor session without a refresh, short enough that a link pasted into a
 * public place stops working the same day.
 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * The object path inside `bucket`, or null if the value does not name an
 * object in that bucket.
 *
 * Rejecting a value that names a DIFFERENT bucket is the point of taking the
 * bucket as an argument: callers pass a user-supplied string, and a signer
 * that trusted the bucket in the URL would let a caller with permission on one
 * bucket sign an object in another.
 */
export function objectPathFromStoredValue(value: string, bucket: string): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    // `/storage/v1/object/public/<bucket>/<path>` and the `sign` variant.
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
    );
    if (!match) return null;
    const [, urlBucket, rawPath] = match;
    if (urlBucket !== bucket) return null;
    const path = safeDecode(rawPath);
    return isSafePath(path) ? path : null;
  }

  // A bare path. Strip a leading bucket segment if the caller stored one.
  const withoutBucket = trimmed.startsWith(`${bucket}/`)
    ? trimmed.slice(bucket.length + 1)
    : trimmed;
  return isSafePath(withoutBucket) ? withoutBucket : null;
}

/**
 * Reject anything that could climb out of the bucket or address a different
 * prefix than the one the caller checked permissions against.
 */
function isSafePath(path: string): boolean {
  if (!path || path.length > 1024) return false;
  if (path.startsWith("/")) return false;
  if (path.includes("..")) return false;
  if (path.includes("\\")) return false;
  // A query string or fragment survived the parse; the value is not a path.
  if (/[?#]/.test(path)) return false;
  return true;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** The first path segment, which by convention is the owning user's id. */
export function ownerIdFromPath(path: string): string | null {
  const first = path.split("/")[0];
  return first && first.length > 0 ? first : null;
}

/**
 * A short-lived signed URL for a private object, or null if it cannot be
 * signed. Never throws: every caller is on a read path where a missing image
 * should degrade to a placeholder rather than a 500.
 */
export async function signedUrlFor(
  db: SupabaseClient,
  bucket: string,
  path: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  try {
    const { data, error } = await db.storage.from(bucket).createSignedUrl(path, ttlSeconds);
    if (error || !data?.signedUrl) {
      console.warn(`[storage-refs] could not sign ${bucket}/${path}:`, error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn(`[storage-refs] sign threw for ${bucket}/${path}:`, err);
    return null;
  }
}
