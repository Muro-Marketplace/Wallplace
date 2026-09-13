// Migration 150. The owner removed the minimum monthly loan fee on 13 September
// 2026. Row security lets an artist write their own row directly, so the
// per-size fee rule lives in the database too; this holds that rule to "above
// £0, up to £100,000", with the same safeguards migration 149 shipped with.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/150_loan_fee_no_minimum.sql"),
  "utf8",
);

describe("150_loan_fee_no_minimum.sql", () => {
  it("replaces the per-size fee check's function in place, so the constraint keeps using it", () => {
    expect(SQL).toMatch(/create or replace function public\.artist_work_pricing_loan_fees_valid\(p jsonb\)/i);
    expect(SQL).not.toMatch(/drop (function|constraint)/i);
  });

  it("accepts any fee above £0 up to £100,000, with no minimum", () => {
    expect(SQL).toMatch(/'paidLoanMonthlyGbp'\)::numeric > 0\b/i);
    expect(SQL).toMatch(/'paidLoanMonthlyGbp'\)::numeric <= 100000/i);
    expect(SQL).not.toMatch(/::numeric >= \d/i);
  });

  it("keeps search_path pinned and EXECUTE with the writing role", () => {
    expect(SQL).toMatch(/set search_path = ''/i);
    expect(SQL).not.toMatch(/security definer/i);
    expect(SQL).not.toMatch(/revoke\s+execute/i);
  });
});
