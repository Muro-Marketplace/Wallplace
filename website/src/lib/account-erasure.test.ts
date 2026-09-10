import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ERASURE_BUCKETS,
  ERASURE_TABLES,
  ERASURE_TABLES_BY_EMAIL,
  purgeUserStorage,
} from "./account-erasure";

interface BucketState {
  /** Object names (not paths) under `${userId}/`, in list order. */
  names?: string[];
  listError?: string;
  removeError?: string;
}

function fakeStorage(state: Record<string, BucketState>) {
  const removed: Record<string, string[]> = {};
  const db = {
    storage: {
      from: (bucket: string) => ({
        list: async (prefix: string, opts: { limit: number; offset: number }) => {
          const s = state[bucket] ?? {};
          if (s.listError) return { data: null, error: { message: s.listError } };
          const all = (s.names ?? []).map((name) => ({ name, id: `id-${name}` }));
          void prefix;
          return { data: all.slice(opts.offset, opts.offset + opts.limit), error: null };
        },
        remove: async (paths: string[]) => {
          const s = state[bucket] ?? {};
          if (s.removeError) return { data: null, error: { message: s.removeError } };
          removed[bucket] = [...(removed[bucket] ?? []), ...paths];
          return { data: paths, error: null };
        },
      }),
    },
  };
  return { db: db as unknown as SupabaseClient, removed };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("purgeUserStorage", () => {
  it("removes every object under the user's folder, in every bucket", async () => {
    const { db, removed } = fakeStorage({
      artworks: { names: ["a.webp", "b.webp"] },
      avatars: { names: ["me.jpg"] },
    });

    const result = await purgeUserStorage(db, "u-1");

    expect(result.failures).toEqual([]);
    expect(result.removed).toBe(3);
    expect(removed.artworks).toEqual(["u-1/a.webp", "u-1/b.webp"]);
    expect(removed.avatars).toEqual(["u-1/me.jpg"]);
  });

  it("pages past the 100-object list cap", async () => {
    // An artist with a large portfolio was the case that would have been
    // half-cleared while the route reported success.
    const names = Array.from({ length: 250 }, (_, i) => `w${i}.webp`);
    const { db, removed } = fakeStorage({ artworks: { names } });

    const result = await purgeUserStorage(db, "u-1");

    expect(result.removed).toBe(250);
    expect(removed.artworks).toHaveLength(250);
    expect(removed.artworks[249]).toBe("u-1/w249.webp");
  });

  it("collects a failure and carries on to the other buckets", async () => {
    // Stopping at the first error leaves MORE behind than carrying on, and the
    // caller refuses to delete the auth user while any failure stands.
    const { db, removed } = fakeStorage({
      artworks: { names: ["a.webp"], removeError: "denied" },
      avatars: { names: ["me.jpg"] },
    });

    const result = await purgeUserStorage(db, "u-1");

    expect(result.failures).toEqual(["storage:artworks: denied"]);
    expect(removed.avatars).toEqual(["u-1/me.jpg"]);
    expect(result.removed).toBe(1);
  });

  it("reports a list failure rather than treating the bucket as empty", async () => {
    // Silently reading "no objects" out of a broken list call is how you get an
    // erasure that reports success and removes nothing.
    const { db } = fakeStorage({ artworks: { listError: "boom" } });
    const result = await purgeUserStorage(db, "u-1");
    expect(result.failures).toEqual(["storage:artworks: boom"]);
  });

  it("is a no-op with no failures when the user has uploaded nothing", async () => {
    const { db } = fakeStorage({});
    await expect(purgeUserStorage(db, "u-1")).resolves.toEqual({ removed: 0, failures: [] });
  });
});

describe("the erasure lists", () => {
  it("covers every bucket the app writes to", () => {
    // Kept in step with src/lib/upload.ts and api/walls/upload-photo by hand;
    // this is the assertion that says so out loud.
    expect([...ERASURE_BUCKETS].sort()).toEqual([
      "artworks",
      "avatars",
      "collections",
      "contracts",
      "message-attachments",
      "wall-photos",
      "wall-renders",
    ]);
  });

  it("includes the tables the audit found missing", () => {
    const pairs = ERASURE_TABLES.map((t) => `${t.table}.${t.col}`);
    for (const missing of [
      "customer_addresses.user_id",
      "blogs.author_user_id",
      "user_blocks.blocker_user_id",
      "feature_requests.user_id",
      "curation_requests.requester_user_id",
    ]) {
      expect(pairs, `${missing} was a documented erasure gap`).toContain(missing);
    }
  });

  it("leaves cart_sessions to the retention job, because it has no user column", () => {
    // The audit listed it as an erasure gap. Checking the live schema showed it
    // is keyed by stripe_session_id and carries no user id at all, so there is
    // nothing for an erasure pass to match on. Its shipping PII expires on a
    // schedule instead. Asserted so the wrong fix is not attempted again.
    expect(ERASURE_TABLES.map((t) => t.table)).not.toContain("cart_sessions");
  });

  it("closes the email-keyed gap the delete route documented", () => {
    const pairs = ERASURE_TABLES_BY_EMAIL.map((t) => `${t.table}.${t.col}`);
    expect(pairs).toContain("newsletter_subscribers.email");
    expect(pairs).toContain("email_suppressions.email");
    expect(pairs).toContain("artist_applications.email");
    expect(pairs).toContain("venue_registrations.email");
  });

  it("keeps profiles last so a child row never blocks the parent delete", () => {
    const names = ERASURE_TABLES.map((t) => t.table);
    const lastThree = names.slice(-3);
    expect(lastThree).toEqual(["artist_profiles", "venue_profiles", "customer_profiles"]);
  });

  it("retains the financial and safety records on purpose", () => {
    const names = new Set(ERASURE_TABLES.map((t) => t.table));
    for (const retained of [
      "orders",
      "refund_requests",
      "stripe_transfers",
      "admin_audit_log",
      "reports",
      "moderation_queue",
    ]) {
      expect(names.has(retained), `${retained} must not be deleted on erasure`).toBe(false);
    }
  });
});
