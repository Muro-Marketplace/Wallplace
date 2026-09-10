/**
 * Signed read URLs for message attachments.
 *
 * Migration 140 made `message-attachments` private. It had been public since
 * migration 043, which meant every file sent inside a private conversation,
 * PDFs included, sat at a stable unauthenticated URL forever. Migration 070
 * dropped the bucket's SELECT policy, which does nothing while the bucket's own
 * `public` flag is true, and its own comment said as much.
 *
 * Rather than rewrite `messages.attachments[].url` across historical rows, the
 * reader re-signs on the way out. Two consequences worth stating:
 *
 *   - Rows written before migration 140 hold a public URL. `objectPathFromStoredValue`
 *     parses the object path back out of it, so old and new rows read the same.
 *   - The signing happens in GET /api/messages/[conversationId], AFTER
 *     assertConversationParticipant has proved the caller is a party to the
 *     conversation. That is what authorises the signature: the URL is only ever
 *     minted for someone already entitled to read the message it hangs off.
 *
 * An attachment that cannot be signed keeps its stored URL rather than
 * disappearing from the thread. On a private bucket that URL 404s, which reads
 * as a broken image, and a broken image is a better failure than a message that
 * silently loses the file it was sent to carry.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { objectPathFromStoredValue, signedUrlFor } from "@/lib/storage-refs";

export const MESSAGE_ATTACHMENTS_BUCKET = "message-attachments";

interface AttachmentLike {
  url?: unknown;
  [key: string]: unknown;
}

interface MessageLike {
  attachments?: unknown;
  [key: string]: unknown;
}

/**
 * Return the messages with every attachment URL replaced by a short-lived
 * signed URL. Messages without attachments pass through untouched, and the
 * whole batch signs in parallel: a long thread should cost one round trip's
 * latency, not one per file.
 */
export async function signMessageAttachments<T extends MessageLike>(
  messages: T[],
  db: SupabaseClient,
): Promise<T[]> {
  // Collect every distinct object path first, so a file quoted twice in a
  // thread is signed once.
  const pathByStoredUrl = new Map<string, string>();
  for (const message of messages) {
    for (const attachment of attachmentsOf(message)) {
      const stored = typeof attachment.url === "string" ? attachment.url : "";
      if (!stored || pathByStoredUrl.has(stored)) continue;
      const path = objectPathFromStoredValue(stored, MESSAGE_ATTACHMENTS_BUCKET);
      if (path) pathByStoredUrl.set(stored, path);
    }
  }
  if (pathByStoredUrl.size === 0) return messages;

  const entries = [...pathByStoredUrl.entries()];
  const signed = await Promise.all(
    entries.map(([, path]) => signedUrlFor(db, MESSAGE_ATTACHMENTS_BUCKET, path)),
  );

  const signedByStoredUrl = new Map<string, string>();
  entries.forEach(([stored], i) => {
    const url = signed[i];
    if (url) signedByStoredUrl.set(stored, url);
  });
  if (signedByStoredUrl.size === 0) return messages;

  return messages.map((message) => {
    const attachments = attachmentsOf(message);
    if (attachments.length === 0) return message;
    return {
      ...message,
      attachments: attachments.map((attachment) => {
        const stored = typeof attachment.url === "string" ? attachment.url : "";
        const replacement = signedByStoredUrl.get(stored);
        return replacement ? { ...attachment, url: replacement } : attachment;
      }),
    };
  });
}

function attachmentsOf(message: MessageLike): AttachmentLike[] {
  const raw = message.attachments;
  if (!Array.isArray(raw)) return [];
  return raw.filter((a): a is AttachmentLike => typeof a === "object" && a !== null);
}
