// Sample per-work terms (specs 2026-09-13). The seed catalogue is what shows the
// card line off, so its data has to be a state the product could really hold:
// the database's fee range, fees only where paid loan is offered, and ticks
// changed in both directions so every state of the card can be seen.
import { describe, expect, it } from "vitest";
import { artists } from "./artists";
import { PAID_LOAN_MIN_GBP } from "@/lib/pricing";
import { resolveWorkTerms } from "@/lib/work-terms";

const works = artists.flatMap((artist) =>
  artist.works.map((work) => ({ artist, work, terms: resolveWorkTerms(work, artist) })),
);
const withFees = works.filter(({ work }) => work.pricing.some((size) => size.paidLoanMonthlyGbp != null));

describe("seed catalogue per-work terms", () => {
  it("lists fees on several works, some differing by size and some not", () => {
    expect(withFees.length).toBeGreaterThanOrEqual(5);
    expect(works.some(({ terms }) => terms.paidLoanFeesVary)).toBe(true);
    expect(works.some(({ terms }) => terms.paidLoanFromGbp !== null && !terms.paidLoanFeesVary)).toBe(true);
  });

  it("lists fees only on works offered on paid loan, within the floor and cap", () => {
    for (const { work, terms } of withFees) {
      expect(terms.openToFreeLoan, work.id).toBe(true);
      for (const size of work.pricing) {
        if (size.paidLoanMonthlyGbp == null) continue;
        expect(size.paidLoanMonthlyGbp, work.id).toBeGreaterThanOrEqual(PAID_LOAN_MIN_GBP);
        expect(size.paidLoanMonthlyGbp, work.id).toBeLessThanOrEqual(100_000);
      }
    }
  });

  it("changes a tick in each direction somewhere", () => {
    expect(works.some(({ artist, work }) => work.openToFreeLoanOverride === true && !artist.openToFreeLoan)).toBe(true);
    expect(works.some(({ artist, work }) => work.openToFreeLoanOverride === false && artist.openToFreeLoan)).toBe(true);
    expect(works.some(({ artist, work }) => work.openToRevenueShareOverride === false && artist.openToRevenueShare)).toBe(true);
  });

  it("sets a work's own rate only where revenue share is offered, as a whole number from 1 to 100", () => {
    const own = works.filter(({ work }) => work.revenueShareOverride != null);
    expect(own.length).toBeGreaterThanOrEqual(1);
    for (const { work, terms } of own) {
      expect(terms.openToRevenueShare, work.id).toBe(true);
      expect(Number.isInteger(work.revenueShareOverride), work.id).toBe(true);
      expect(work.revenueShareOverride!, work.id).toBeGreaterThanOrEqual(1);
      expect(work.revenueShareOverride!, work.id).toBeLessThanOrEqual(100);
    }
  });

  it("carries no retired work-level fee", () => {
    for (const { work } of works) {
      expect((work as { paidLoanMonthlyGbp?: unknown }).paidLoanMonthlyGbp, work.id).toBeUndefined();
    }
  });
});
