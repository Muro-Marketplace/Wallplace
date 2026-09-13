import { describe, expect, it } from "vitest";
import { PAID_LOAN_MIN_GBP } from "./pricing";
import {
  MIXED_TERMS_NOTE,
  formatMonthlyFee,
  initialPlacementTerms,
  parseWorkTermsForm,
  resolveWorkTerms,
  speakMonthlyFee,
  workTermsFromRow,
} from "./work-terms";

describe("resolveWorkTerms", () => {
  it("uses the work's own share when it has one", () => {
    expect(resolveWorkTerms({ revenueShareOverride: 30 }, { revenueSharePercent: 25 })).toEqual({
      revenueSharePercent: 30,
      usesDefaultShare: false,
      paidLoanMonthlyGbp: null,
    });
  });

  it("treats an explicit 0 as the work's own share, not as blank", () => {
    const terms = resolveWorkTerms({ revenueShareOverride: 0 }, { revenueSharePercent: 25 });
    expect(terms.revenueSharePercent).toBe(0);
    expect(terms.usesDefaultShare).toBe(false);
  });

  it("falls back to the artist's default when the work has none", () => {
    const terms = resolveWorkTerms({ revenueShareOverride: null }, { revenueSharePercent: 25 });
    expect(terms.revenueSharePercent).toBe(25);
    expect(terms.usesDefaultShare).toBe(true);
  });

  it("resolves to 0 when neither the work nor the artist has a share", () => {
    expect(resolveWorkTerms({}, {}).revenueSharePercent).toBe(0);
  });

  it("passes a listed fee through and leaves an unlisted one null", () => {
    expect(resolveWorkTerms({ paidLoanMonthlyGbp: 42.5 }, {}).paidLoanMonthlyGbp).toBe(42.5);
    expect(resolveWorkTerms({}, {}).paidLoanMonthlyGbp).toBeNull();
  });
});

describe("workTermsFromRow", () => {
  it("reads both columns off a raw row, tolerating a numeric string", () => {
    expect(workTermsFromRow({ revenue_share_percent: 30, paid_loan_monthly_gbp: "42.50" })).toEqual({
      revenueShareOverride: 30,
      paidLoanMonthlyGbp: 42.5,
    });
  });

  it("reads missing or null columns as no value", () => {
    expect(workTermsFromRow({})).toEqual({ revenueShareOverride: null, paidLoanMonthlyGbp: null });
    expect(workTermsFromRow({ revenue_share_percent: null, paid_loan_monthly_gbp: null })).toEqual({
      revenueShareOverride: null,
      paidLoanMonthlyGbp: null,
    });
  });
});

describe("initialPlacementTerms", () => {
  const artist = { revenueSharePercent: 25 };

  it("keeps the form's own defaults when nothing is selected", () => {
    expect(initialPlacementTerms([], artist)).toEqual({ revenueSharePercent: null, monthlyFeeGbp: null, mixed: false });
  });

  it("starts from a single work's terms", () => {
    expect(initialPlacementTerms([{ revenueShareOverride: 30, paidLoanMonthlyGbp: 40 }], artist)).toEqual({
      revenueSharePercent: 30,
      monthlyFeeGbp: 40,
      mixed: false,
    });
  });

  it("uses the artist's default for a work without its own share", () => {
    expect(initialPlacementTerms([{}], artist).revenueSharePercent).toBe(25);
  });

  it("keeps the form's own starting share when there is no share anywhere", () => {
    expect(initialPlacementTerms([{}], {}).revenueSharePercent).toBeNull();
  });

  it("totals the listed fees and does not flag works that agree on the share", () => {
    expect(initialPlacementTerms([{ paidLoanMonthlyGbp: 40 }, { paidLoanMonthlyGbp: 60 }], artist)).toEqual({
      revenueSharePercent: 25,
      monthlyFeeGbp: 100,
      mixed: false,
    });
  });

  it("takes the first work's share and flags works whose shares differ", () => {
    const terms = initialPlacementTerms([{ revenueShareOverride: 30 }, {}], artist);
    expect(terms.revenueSharePercent).toBe(30);
    expect(terms.mixed).toBe(true);
  });

  it("flags a selection where only some works list a fee", () => {
    const terms = initialPlacementTerms([{ paidLoanMonthlyGbp: 40 }, {}], artist);
    expect(terms.monthlyFeeGbp).toBe(40);
    expect(terms.mixed).toBe(true);
  });

  it("rounds the total to pence", () => {
    expect(initialPlacementTerms([{ paidLoanMonthlyGbp: 15.1 }, { paidLoanMonthlyGbp: 15.2 }], artist).monthlyFeeGbp).toBe(30.3);
  });

  it("words the note without dashes", () => {
    expect(MIXED_TERMS_NOTE).not.toMatch(/[–—]/);
  });
});

describe("parseWorkTermsForm", () => {
  it("reads blanks as no value", () => {
    expect(parseWorkTermsForm("", " ")).toEqual({ ok: true, revenueShareOverride: null, paidLoanMonthlyGbp: null });
  });

  it("accepts a whole-number share and a fee, rounding the fee to pence", () => {
    expect(parseWorkTermsForm("30", "42.499")).toEqual({ ok: true, revenueShareOverride: 30, paidLoanMonthlyGbp: 42.5 });
  });

  it("refuses a share that is fractional or out of range", () => {
    for (const raw of ["12.5", "-1", "101", "abc"]) {
      expect(parseWorkTermsForm(raw, "").ok).toBe(false);
    }
  });

  it("refuses a fee under the paid loan floor or over the cap", () => {
    expect(parseWorkTermsForm("", String(PAID_LOAN_MIN_GBP - 1)).ok).toBe(false);
    expect(parseWorkTermsForm("", "100001").ok).toBe(false);
    expect(parseWorkTermsForm("", String(PAID_LOAN_MIN_GBP)).ok).toBe(true);
  });
});

describe("fee wording", () => {
  it("drops pence on whole pounds and keeps two decimals otherwise", () => {
    expect(formatMonthlyFee(40)).toBe("£40/month");
    expect(formatMonthlyFee(42.5)).toBe("£42.50/month");
    expect(speakMonthlyFee(40)).toBe("£40 a month");
  });
});
