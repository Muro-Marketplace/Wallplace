import { describe, expect, it } from "vitest";
import { venueStartingTerms } from "./venue-starting-terms";

const artist = { revenueSharePercent: 20, openToRevenueShare: true, openToFreeLoan: true };
const harbour = {
  title: "Harbour Light",
  revenueShareOverride: 30,
  pricing: [
    { label: "A4", price: 100, paidLoanMonthlyGbp: 25 },
    { label: "A2", price: 300, paidLoanMonthlyGbp: 55 },
  ],
};
const tide = { title: "Second Tide", pricing: [{ label: "A4", price: 90, paidLoanMonthlyGbp: 30 }] };

describe("venueStartingTerms", () => {
  it("starts from the chosen size's fee and the work's own share", () => {
    expect(venueStartingTerms([harbour, tide], { "Harbour Light": "A2" }, artist))
      .toEqual({ revenueSharePercent: 30, monthlyFeeGbp: 55, mixed: false });
  });

  it("uses the lowest listed fee for Any size", () => {
    expect(venueStartingTerms([harbour], { "Harbour Light": "" }, artist).monthlyFeeGbp).toBe(25);
  });

  it("follows the order the venue ticked works in, and totals their fees", () => {
    expect(venueStartingTerms([harbour, tide], { "Second Tide": "", "Harbour Light": "A4" }, artist))
      .toEqual({ revenueSharePercent: 20, monthlyFeeGbp: 55, mixed: true });
  });

  it("ignores a ticked title the artist's works no longer include", () => {
    expect(venueStartingTerms([tide], { "Gone Work": "", "Second Tide": "" }, artist))
      .toEqual({ revenueSharePercent: 20, monthlyFeeGbp: 30, mixed: false });
  });

  it("keeps the form's own defaults when nothing is ticked", () => {
    expect(venueStartingTerms([harbour], {}, artist)).toEqual({ revenueSharePercent: null, monthlyFeeGbp: null, mixed: false });
  });
});
