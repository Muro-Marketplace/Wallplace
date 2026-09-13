import { describe, expect, it } from "vitest";
import { PAID_LOAN_MIN_GBP } from "./pricing";
import {
  LOAN_FEE_RANGE_ERROR,
  MIXED_TERMS_NOTE,
  REVENUE_SHARE_RATE_ERROR,
  formatMonthlyFee,
  initialPlacementTerms,
  loanFeeSizesFromRow,
  paidLoanFeeForSize,
  parseWorkArrangements,
  resolveWorkTerms,
  speakMonthlyFee,
  workTermsFromRow,
  workTermsSourceFromRow,
  type WorkTermsInput,
} from "./work-terms";

/** Sizes S1, S2, ... carrying the given fees. */
const fees = (...values: Array<number | null>) =>
  values.map((paidLoanMonthlyGbp, i) => ({ label: `S${i + 1}`, paidLoanMonthlyGbp }));

const open = { revenueSharePercent: 25, openToRevenueShare: true, openToFreeLoan: true };

describe("resolveWorkTerms", () => {
  it("uses the work's own share when it has one", () => {
    expect(resolveWorkTerms({ revenueShareOverride: 30 }, open)).toMatchObject({ revenueSharePercent: 30, usesDefaultShare: false });
  });

  it("falls back to the artist's default, and to 0 when there is none", () => {
    expect(resolveWorkTerms({}, open)).toMatchObject({ revenueSharePercent: 25, usesDefaultShare: true });
    expect(resolveWorkTerms({}, {}).revenueSharePercent).toBe(0);
  });

  it("follows the profile's ticks until the work sets its own", () => {
    const closed = { ...open, openToRevenueShare: false, openToFreeLoan: false };
    expect(resolveWorkTerms({}, closed)).toMatchObject({ openToRevenueShare: false, openToFreeLoan: false });
    expect(resolveWorkTerms({ openToRevenueShareOverride: true, openToFreeLoanOverride: true }, closed))
      .toMatchObject({ openToRevenueShare: true, openToFreeLoan: true });
    expect(resolveWorkTerms({ openToRevenueShareOverride: false, openToFreeLoanOverride: false }, open))
      .toMatchObject({ openToRevenueShare: false, openToFreeLoan: false });
  });

  it("reads a profile with no ticks as open, as the profile transform does", () => {
    expect(resolveWorkTerms({}, { revenueSharePercent: 25 })).toMatchObject({ openToRevenueShare: true, openToFreeLoan: true });
  });

  it("shows no share on a work not open to revenue share, even with a rate of its own", () => {
    expect(resolveWorkTerms({ revenueShareOverride: 30, openToRevenueShareOverride: false }, open).revenueSharePercent).toBe(0);
  });

  it("reports the lowest listed fee and whether the sizes differ", () => {
    expect(resolveWorkTerms({ pricing: fees(60, 40, null) }, open)).toMatchObject({ paidLoanFromGbp: 40, paidLoanFeesVary: true });
    expect(resolveWorkTerms({ pricing: fees(40, 40) }, open)).toMatchObject({ paidLoanFromGbp: 40, paidLoanFeesVary: false });
    expect(resolveWorkTerms({ pricing: fees(null) }, open)).toMatchObject({ paidLoanFromGbp: null, paidLoanFeesVary: false });
  });

  it("lists no fee on a work not open to paid loan", () => {
    expect(resolveWorkTerms({ pricing: fees(40), openToFreeLoanOverride: false }, open).paidLoanFromGbp).toBeNull();
  });

  it("ignores the retired work-level fee", () => {
    expect(resolveWorkTerms({ paidLoanMonthlyGbp: 40 } as WorkTermsInput, open)).not.toHaveProperty("paidLoanMonthlyGbp");
    expect(workTermsFromRow({ paid_loan_monthly_gbp: 40 })).not.toHaveProperty("paidLoanMonthlyGbp");
  });
});

describe("paidLoanFeeForSize", () => {
  const work = {
    pricing: [
      { label: "A4", paidLoanMonthlyGbp: 30 },
      { label: "A3", paidLoanMonthlyGbp: null },
      { label: "A2", paidLoanMonthlyGbp: 55 },
    ],
  };

  it("returns the fee for the chosen size", () => {
    expect(paidLoanFeeForSize(work, "A2")).toBe(55);
  });

  it("returns null for a chosen size that lists no fee", () => {
    expect(paidLoanFeeForSize(work, "A3")).toBeNull();
  });

  it("returns the lowest listed fee with no size, or a label that names none of the sizes", () => {
    expect(paidLoanFeeForSize(work)).toBe(30);
    expect(paidLoanFeeForSize(work, "")).toBe(30);
    expect(paidLoanFeeForSize(work, "70 x 100 cm")).toBe(30);
  });
});

describe("reading raw artist_works rows", () => {
  it("reads the rate and both ticks, tolerating a numeric string and ignoring non-booleans", () => {
    expect(workTermsFromRow({ revenue_share_percent: "30", open_to_revenue_share: false, open_to_free_loan: "yes" }))
      .toMatchObject({ revenueShareOverride: 30, openToRevenueShareOverride: false, openToFreeLoanOverride: null });
  });

  it("reads missing columns as following the profile", () => {
    expect(workTermsFromRow({}))
      .toMatchObject({ revenueShareOverride: null, openToRevenueShareOverride: null, openToFreeLoanOverride: null });
  });

  it("reads per-size fees off pricing, by label or the legacy size key", () => {
    expect(loanFeeSizesFromRow([{ label: "A4", price: 120, paidLoanMonthlyGbp: "42.50" }, { size: "A3" }, null, "x"]))
      .toEqual([{ label: "A4", paidLoanMonthlyGbp: 42.5 }, { label: "A3", paidLoanMonthlyGbp: null }]);
    expect(loanFeeSizesFromRow(undefined)).toEqual([]);
  });

  it("builds a whole terms source from one row", () => {
    const source = workTermsSourceFromRow({ open_to_free_loan: true, pricing: [{ label: "A4", paidLoanMonthlyGbp: 40 }] });
    expect(source.openToFreeLoanOverride).toBe(true);
    expect(source.pricing).toEqual([{ label: "A4", paidLoanMonthlyGbp: 40 }]);
  });
});

describe("initialPlacementTerms", () => {
  it("keeps the form's own defaults when nothing is selected", () => {
    expect(initialPlacementTerms([], open)).toEqual({ revenueSharePercent: null, monthlyFeeGbp: null, mixed: false });
  });

  it("starts from one work's share and the fee for its chosen size", () => {
    expect(initialPlacementTerms([{ revenueShareOverride: 30, pricing: fees(40, 60), sizeLabel: "S2" }], open))
      .toEqual({ revenueSharePercent: 30, monthlyFeeGbp: 60, mixed: false });
  });

  it("starts from the lowest listed fee when no size is chosen", () => {
    expect(initialPlacementTerms([{ pricing: fees(60, 40) }], open).monthlyFeeGbp).toBe(40);
  });

  it("keeps the form's own starting share when there is no share anywhere", () => {
    expect(initialPlacementTerms([{}], {}).revenueSharePercent).toBeNull();
  });

  it("starts the share at the first work open to revenue share, and flags the difference", () => {
    const terms = initialPlacementTerms([{ openToRevenueShareOverride: false }, { revenueShareOverride: 30 }], open);
    expect(terms).toMatchObject({ revenueSharePercent: 30, mixed: true });
  });

  it("leaves a work not open to paid loan out of the fee total", () => {
    const terms = initialPlacementTerms([{ pricing: fees(40) }, { pricing: fees(60), openToFreeLoanOverride: false }], open);
    expect(terms).toMatchObject({ monthlyFeeGbp: 40, mixed: true });
  });

  it("totals the fees of works that agree, without flagging them", () => {
    expect(initialPlacementTerms([{ pricing: fees(40) }, { pricing: fees(60) }], open))
      .toEqual({ revenueSharePercent: 25, monthlyFeeGbp: 100, mixed: false });
  });

  it("flags works whose shares differ, or where only some list a fee", () => {
    expect(initialPlacementTerms([{ revenueShareOverride: 30 }, {}], open).mixed).toBe(true);
    expect(initialPlacementTerms([{ pricing: fees(40) }, {}], open).mixed).toBe(true);
  });

  it("rounds the total to pence", () => {
    expect(initialPlacementTerms([{ pricing: fees(15.1) }, { pricing: fees(15.2) }], open).monthlyFeeGbp).toBe(30.3);
  });

  it("words the note without dashes", () => {
    expect(MIXED_TERMS_NOTE).not.toMatch(/[–—]/);
  });
});

describe("fee wording", () => {
  it("drops pence on whole pounds and keeps two decimals otherwise", () => {
    expect(formatMonthlyFee(40)).toBe("£40/month");
    expect(formatMonthlyFee(42.5)).toBe("£42.50/month");
    expect(speakMonthlyFee(40)).toBe("£40 a month");
  });
});

describe("parseWorkArrangements", () => {
  const profile = { revenueSharePercent: 20, openToRevenueShare: true, openToFreeLoan: true };
  const untouched = { revenueShareOffered: null, revenueShareRate: null, paidLoanOffered: null, loanFees: [] as string[] };

  it("saves nothing of its own for a work nobody changed", () => {
    expect(parseWorkArrangements(untouched, profile)).toEqual({
      ok: true,
      openToRevenueShareOverride: null,
      openToFreeLoanOverride: null,
      revenueShareOverride: null,
      loanFees: [],
    });
  });

  it("saves a tick only when it differs from the profile", () => {
    expect(parseWorkArrangements({ ...untouched, revenueShareOffered: false, paidLoanOffered: true }, profile))
      .toMatchObject({ ok: true, openToRevenueShareOverride: false, openToFreeLoanOverride: null });
  });

  it("saves a rate only when it differs from the profile rate", () => {
    expect(parseWorkArrangements({ ...untouched, revenueShareRate: "20" }, profile)).toMatchObject({ revenueShareOverride: null });
    expect(parseWorkArrangements({ ...untouched, revenueShareRate: "30" }, profile)).toMatchObject({ revenueShareOverride: 30 });
  });

  it("refuses a typed rate outside 1 to 100 while revenue share is ticked", () => {
    for (const raw of ["", "0", "101", "12.5", "abc"]) {
      expect(parseWorkArrangements({ ...untouched, revenueShareRate: raw }, profile))
        .toEqual({ ok: false, error: REVENUE_SHARE_RATE_ERROR });
    }
  });

  it("does not check the rate while revenue share is unticked", () => {
    expect(parseWorkArrangements({ ...untouched, revenueShareOffered: false, revenueShareRate: "abc" }, profile))
      .toMatchObject({ ok: true, revenueShareOverride: null });
  });

  it("never blocks a save on a rate that follows the profile", () => {
    expect(parseWorkArrangements(untouched, { ...profile, revenueSharePercent: null }).ok).toBe(true);
  });

  it("reads each size's fee, rounding to pence and keeping blanks as none", () => {
    expect(parseWorkArrangements({ ...untouched, loanFees: ["42.499", " ", String(PAID_LOAN_MIN_GBP)] }, profile))
      .toMatchObject({ ok: true, loanFees: [42.5, null, PAID_LOAN_MIN_GBP] });
  });

  it("refuses a fee outside the range while paid loan is ticked, and drops it while unticked", () => {
    expect(parseWorkArrangements({ ...untouched, loanFees: ["5"] }, profile)).toEqual({ ok: false, error: LOAN_FEE_RANGE_ERROR });
    expect(parseWorkArrangements({ ...untouched, loanFees: ["100001"] }, profile)).toEqual({ ok: false, error: LOAN_FEE_RANGE_ERROR });
    expect(parseWorkArrangements({ ...untouched, paidLoanOffered: false, loanFees: ["5", "40"] }, profile))
      .toMatchObject({ ok: true, openToFreeLoanOverride: false, loanFees: [null, 40] });
  });
});
