import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { materialiseMarketingConsent, signupOptedIntoMarketing } from "./marketing-consent";

interface DbConfig {
  existing?: { user_id: string } | null;
  readError?: { message: string } | null;
  writeError?: { message: string; code?: string } | null;
}

const inserts: Record<string, unknown>[] = [];

function setupDb(cfg: DbConfig = {}) {
  inserts.length = 0;
  const { existing = null, readError = null, writeError = null } = cfg;
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: existing, error: readError }) }),
      }),
      insert: async (row: Record<string, unknown>) => {
        inserts.push(row);
        return { error: writeError };
      },
    }),
  } as unknown as SupabaseClient;
}

const USER = { id: "u-1", user_metadata: { marketing_opt_in: true } };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("signupOptedIntoMarketing", () => {
  it("is true only for an explicit boolean true", () => {
    expect(signupOptedIntoMarketing({ user_metadata: { marketing_opt_in: true } })).toBe(true);
    // A string "true" is what a hand-rolled form post would send, and it is
    // not a tick on a checkbox.
    expect(signupOptedIntoMarketing({ user_metadata: { marketing_opt_in: "true" } })).toBe(false);
    expect(signupOptedIntoMarketing({ user_metadata: { marketing_opt_in: false } })).toBe(false);
    expect(signupOptedIntoMarketing({ user_metadata: {} })).toBe(false);
    expect(signupOptedIntoMarketing({ user_metadata: null as never })).toBe(false);
  });
});

describe("materialiseMarketingConsent", () => {
  it("creates the row with both news-stream categories on when the user opted in", async () => {
    const db = setupDb({ existing: null });
    await expect(materialiseMarketingConsent(USER, db)).resolves.toBe("created");
    expect(inserts).toEqual([
      { user_id: "u-1", tips_enabled: true, recommendations_enabled: true },
    ]);
  });

  it("writes nothing when the signup recorded no opt-in", async () => {
    // The defaults are already no, and send.ts treats a missing row as absence
    // of consent, so a row of falses would say nothing the system does not
    // already assume.
    const db = setupDb({ existing: null });
    await expect(
      materialiseMarketingConsent({ id: "u-1", user_metadata: {} }, db),
    ).resolves.toBe("no_choice_recorded");
    expect(inserts).toEqual([]);
  });

  it("never overwrites an existing row", async () => {
    // The opt-out trap: a user who opts out in the preference centre must not
    // be re-opted-in on their next sign-in by metadata that still says true.
    const db = setupDb({ existing: { user_id: "u-1" } });
    await expect(materialiseMarketingConsent(USER, db)).resolves.toBe("already_recorded");
    expect(inserts).toEqual([]);
  });

  it("treats a unique-violation on insert as the row already existing", async () => {
    const db = setupDb({ existing: null, writeError: { message: "dup", code: "23505" } });
    await expect(materialiseMarketingConsent(USER, db)).resolves.toBe("already_recorded");
  });

  it("reports a read failure rather than guessing", async () => {
    const db = setupDb({ readError: { message: "boom" } });
    await expect(materialiseMarketingConsent(USER, db)).resolves.toBe("failed");
    expect(inserts).toEqual([]);
  });

  it("reports a write failure", async () => {
    const db = setupDb({ existing: null, writeError: { message: "boom" } });
    await expect(materialiseMarketingConsent(USER, db)).resolves.toBe("failed");
  });
});
