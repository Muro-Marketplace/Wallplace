// Sample per-work terms (spec 2026-09-13). The seed catalogue is what shows the
// card line off, so its data has to be a state the product could really hold:
// the same floor and cap as migration 148, and only on arrangements the artist
// is actually open to.
import { describe, expect, it } from "vitest";
import { artists } from "./artists";
import { PAID_LOAN_MIN_GBP } from "@/lib/pricing";

const works = artists.flatMap((artist) => artist.works.map((work) => ({ artist, work })));
const withFee = works.filter(({ work }) => work.paidLoanMonthlyGbp != null);
const withOverride = works.filter(({ work }) => work.revenueShareOverride != null);

describe("seed catalogue per-work terms", () => {
  it("demonstrates a listed fee on several works", () => {
    expect(withFee.length).toBeGreaterThanOrEqual(5);
  });

  it("lists fees only for artists open to paid loans, within the floor and cap", () => {
    for (const { artist, work } of withFee) {
      expect(artist.openToFreeLoan, work.id).toBe(true);
      expect(work.paidLoanMonthlyGbp!, work.id).toBeGreaterThanOrEqual(PAID_LOAN_MIN_GBP);
      expect(work.paidLoanMonthlyGbp!, work.id).toBeLessThanOrEqual(100_000);
    }
  });

  it("sets a work's own share only for artists open to revenue share, as a whole number from 0 to 100", () => {
    expect(withOverride.length).toBeGreaterThanOrEqual(1);
    for (const { artist, work } of withOverride) {
      expect(artist.openToRevenueShare, work.id).toBe(true);
      expect(Number.isInteger(work.revenueShareOverride), work.id).toBe(true);
      expect(work.revenueShareOverride!, work.id).toBeGreaterThanOrEqual(0);
      expect(work.revenueShareOverride!, work.id).toBeLessThanOrEqual(100);
    }
  });
});
