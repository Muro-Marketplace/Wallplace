// Migration 149. Per-size loan fees live inside the pricing jsonb, and row
// security lets an artist update their own row directly, so the range is held
// in SQL as well as zod. This keeps the two in step, and pins the two ways the
// CHECK's function could break artists' own saves.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PAID_LOAN_MIN_GBP } from "../../src/lib/pricing";

const SQL = readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/149_work_arrangements_and_size_loan_fees.sql"),
  "utf8",
);

describe("149_work_arrangements_and_size_loan_fees.sql", () => {
  it("adds both per-work ticks as nullable booleans with no default, so every work follows its profile", () => {
    expect(SQL).toMatch(/add column if not exists open_to_revenue_share boolean\s*,/i);
    expect(SQL).toMatch(/add column if not exists open_to_free_loan boolean\s*;/i);
    expect(SQL).not.toMatch(/boolean\s+(not null|default)/i);
  });

  it("uses the app's fee floor and the £100,000 cap for each size", () => {
    const floor = /'paidLoanMonthlyGbp'\)::numeric >= (\d+(?:\.\d+)?)/i.exec(SQL)?.[1];
    expect(Number(floor)).toBe(PAID_LOAN_MIN_GBP);
    expect(SQL).toMatch(/'paidLoanMonthlyGbp'\)::numeric <= 100000/i);
  });

  it("pins search_path and leaves EXECUTE with the writing role", () => {
    expect(SQL).toMatch(/set search_path = ''/i);
    expect(SQL).not.toMatch(/security definer/i);
    expect(SQL).not.toMatch(/revoke\s+execute/i);
  });

  it("attaches the check to pricing", () => {
    expect(SQL).toMatch(/check \(public\.artist_work_pricing_loan_fees_valid\(pricing\)\)/i);
  });
});
