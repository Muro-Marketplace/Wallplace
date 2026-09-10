/**
 * The parts of erasure that were missing, in one place both delete routes use.
 *
 * UK compliance audit, 10 September 2026, finding DP-7. POST /api/account/delete
 * removed the user's database rows and left three gaps:
 *
 *   1. Not one storage object was ever deleted. A deleted artist's artwork
 *      images and their avatar, which is often a photograph of them, stayed in
 *      public buckets at working URLs forever. The row said the account was
 *      gone; the files said otherwise.
 *   2. Nine tables holding personal data were not in the list, most sharply
 *      `customer_addresses`, which is a home address.
 *   3. Tables keyed by email rather than user id were documented as a known
 *      gap and left open.
 *
 * All three are closed here. The module is deliberately small and pure enough
 * to test: the routes own the orchestration and the failure policy, this owns
 * knowing WHAT has to go.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Every bucket that can hold an object owned by a user, and the path prefix
 * that identifies them. The convention is `${user.id}/<file>` everywhere in
 * src/lib/upload.ts and in api/walls/upload-photo, so the prefix IS the owner.
 */
export const ERASURE_BUCKETS = [
  "artworks",
  "avatars",
  "collections",
  "message-attachments",
  "wall-photos",
  "wall-renders",
  "contracts",
] as const;

/**
 * Tables deleted outright, keyed on a user-id column.
 *
 * Order matters: children before parents, so a foreign key does not block a
 * delete. `artist_profiles`, `venue_profiles` and `customer_profiles` come last
 * for that reason.
 *
 * Deliberately absent, and each for a reason:
 *   orders, refund_requests          financial records with a lawful retention
 *                                    basis. Anonymised in place instead.
 *   stripe_transfers,                the same, on the payout side.
 *   placement_recurring_billings
 *   programme_rent_accruals
 *   cart_sessions                    has no user column at all: it is keyed by
 *                                    stripe_session_id and carries the buyer's
 *                                    shipping details with an expires_at that
 *                                    nothing enforced. It is a RETENTION
 *                                    problem, not an erasure one, and is
 *                                    handled by src/lib/retention.ts.
 *   admin_audit_log                  the record of what an ADMIN did. Erasing
 *                                    it on request would let an admin delete
 *                                    their own audit trail.
 *   reports, conversation_reports,   safety records. The Online Safety Act
 *   moderation_queue, disputes       expects a provider to keep records of
 *                                    what it was told and what it did. A
 *                                    reporter's identity is scrubbed by the FK
 *                                    (SET NULL on auth.users) while the report
 *                                    itself survives.
 */
export const ERASURE_TABLES: ReadonlyArray<{ table: string; col: string }> = [
  // Per-user UI artefacts
  { table: "saved_items", col: "user_id" },
  { table: "notifications", col: "user_id" },
  { table: "feature_request_upvotes", col: "user_id" },
  { table: "feature_requests", col: "user_id" },
  { table: "artist_referrals", col: "referrer_user_id" },
  { table: "artist_referrals", col: "referred_user_id" },
  { table: "user_blocks", col: "blocker_user_id" },

  // Messaging
  { table: "messages", col: "sender_id" },
  { table: "messages", col: "recipient_user_id" },

  // Content the user authored
  { table: "blogs", col: "author_user_id" },

  // Addresses. DP-7: this was the sharpest omission. A home address survived
  // an erasure that reported success.
  { table: "customer_addresses", col: "user_id" },

  // Placements & related lifecycle records
  { table: "placement_archives", col: "user_id" },
  { table: "placement_photos", col: "uploader_user_id" },
  { table: "placement_records", col: "artist_user_id" },
  { table: "placement_records", col: "venue_user_id" },
  { table: "placement_reviews", col: "reviewer_user_id" },
  { table: "placement_reviews", col: "reviewee_user_id" },
  { table: "placements", col: "artist_user_id" },
  { table: "placements", col: "venue_user_id" },

  // Commerce (minus the retained financial records above)
  { table: "purchase_offers", col: "buyer_user_id" },
  { table: "purchase_offers", col: "artist_user_id" },
  { table: "artwork_request_responses", col: "artist_user_id" },
  { table: "artwork_requests", col: "venue_user_id" },
  { table: "commissions", col: "artist_user_id" },
  { table: "commissions", col: "buyer_user_id" },
  { table: "curation_requests", col: "requester_user_id" },

  // Visualizer suite
  { table: "wall_renders", col: "user_id" },
  { table: "wall_layouts", col: "user_id" },
  { table: "walls", col: "user_id" },
  { table: "visualizer_usage", col: "user_id" },
  { table: "visualizer_quota_overrides", col: "user_id" },

  // Email + terms
  { table: "email_events", col: "user_id" },
  { table: "email_preferences", col: "user_id" },
  { table: "terms_acceptances", col: "user_id" },

  // Profiles last. artist_collections cascades from artist_profiles as of
  // migration 143; before that this delete raised a foreign key violation and
  // stopped the whole erasure for any artist who had made one.
  { table: "artist_profiles", col: "user_id" },
  { table: "venue_profiles", col: "user_id" },
  { table: "customer_profiles", col: "user_id" },
];

/**
 * Tables holding personal data keyed by EMAIL, not by user id.
 *
 * These were the documented "known gap". They are matched strictly against the
 * account's own verified email (auth.user.email), never against anything in a
 * request body, so this can never reach another person's rows.
 */
export const ERASURE_TABLES_BY_EMAIL: ReadonlyArray<{ table: string; col: string }> = [
  { table: "waitlist_signups", col: "email" },
  { table: "contact_submissions", col: "email" },
  { table: "enquiries", col: "sender_email" },
  { table: "artist_applications", col: "email" },
  { table: "venue_registrations", col: "email" },
  { table: "newsletter_subscribers", col: "email" },
  { table: "email_suppressions", col: "email" },
  { table: "email_events", col: "to_email" },
];

export interface StoragePurgeResult {
  removed: number;
  /** One label per bucket that could not be fully cleared. */
  failures: string[];
}

/**
 * Delete every storage object under `${userId}/` in every bucket.
 *
 * Paged, because `list` caps at 100 by default and an artist with a large
 * portfolio would otherwise be half-cleared with the route reporting success.
 * Failures are collected rather than thrown: the caller's policy is that a
 * partial erasure must be visible, and a scrub that stops at the first error
 * leaves MORE behind than one that carries on and reports.
 */
export async function purgeUserStorage(
  db: SupabaseClient,
  userId: string,
): Promise<StoragePurgeResult> {
  let removed = 0;
  const failures: string[] = [];

  for (const bucket of ERASURE_BUCKETS) {
    try {
      const paths = await listUserObjects(db, bucket, userId);
      if (paths.length === 0) continue;

      // remove() takes up to 1000 paths; chunk so a big portfolio still goes.
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        const { error } = await db.storage.from(bucket).remove(chunk);
        if (error) {
          failures.push(`storage:${bucket}: ${error.message}`);
          break;
        }
        removed += chunk.length;
      }
    } catch (err) {
      failures.push(`storage:${bucket}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { removed, failures };
}

/** Every object path under the user's own folder in one bucket. */
async function listUserObjects(
  db: SupabaseClient,
  bucket: string,
  userId: string,
): Promise<string[]> {
  const paths: string[] = [];
  const PAGE = 100;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage
      .from(bucket)
      .list(userId, { limit: PAGE, offset });
    if (error) throw new Error(error.message);
    const page = data ?? [];
    for (const entry of page) {
      // A folder entry has no id. Nothing nests below `${userId}/` today, so
      // skipping them is right rather than incomplete.
      if (!entry.id) continue;
      paths.push(`${userId}/${entry.name}`);
    }
    if (page.length < PAGE) break;
  }
  return paths;
}
