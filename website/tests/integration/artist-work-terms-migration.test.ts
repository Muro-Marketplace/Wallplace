// Migration 148 carries the ranges in the database because row security lets a
// signed-in artist write their own artist_works rows directly, skipping zod.
// The fee floor is duplicated into SQL, so this holds the two in step.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/148_artist_work_terms.sql"),
  "utf8",
);

describe("148_artist_work_terms.sql", () => {
  it("adds both columns, nullable", () => {
    expect(SQL).toMatch(/add column if not exists revenue_share_percent integer\s*,/i);
    expect(SQL).toMatch(/add column if not exists paid_loan_monthly_gbp numeric\s*;/i);
    expect(SQL).not.toMatch(/(revenue_share_percent integer|paid_loan_monthly_gbp numeric)\s+not null/i);
  });

  it("holds the share to a whole number from 0 to 100", () => {
    expect(SQL).toMatch(/revenue_share_percent is null or revenue_share_percent between 0 and 100/i);
  });

  // The app has no minimum since 13 September 2026 (migration 150). This column
  // is retired and keeps the £15 floor it shipped with; nothing writes it.
  it("shipped the retired column with a £15 floor and the £100,000 cap", () => {
    const floor = /paid_loan_monthly_gbp >= (\d+(?:\.\d+)?)/i.exec(SQL)?.[1];
    expect(Number(floor)).toBe(15);
    expect(SQL).toMatch(/paid_loan_monthly_gbp <= 100000/i);
  });
});
