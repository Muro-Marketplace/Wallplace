import { describe, expect, it } from "vitest";
import type { Artist } from "./artists";
import { artistsToGalleryWorks } from "./galleries";

const work = {
  id: "w1",
  title: "Harbour Light",
  medium: "Oil",
  dimensions: "40 x 50 cm",
  priceBand: "£200",
  pricing: [],
  available: true,
  color: "#000000",
  image: "/w1.jpg",
};

function artistWith(works: Array<Record<string, unknown>>): Artist {
  return {
    slug: "a",
    name: "A",
    works,
    revenueSharePercent: 25,
    openToRevenueShare: true,
    openToFreeLoan: true,
    openToOutrightPurchase: true,
    themes: [],
    location: "",
    coordinates: null,
    primaryMedium: "",
    offersOriginals: true,
    offersPrints: false,
    offersFramed: false,
  } as unknown as Artist;
}

describe("artistsToGalleryWorks: per-work terms (migration 148)", () => {
  it("shows a work's own share instead of the artist's default", () => {
    const [g] = artistsToGalleryWorks([artistWith([{ ...work, revenueShareOverride: 30 }])]);
    expect(g.revenueSharePercent).toBe(30);
  });

  it("falls back to the artist's default for a work without one", () => {
    const [g] = artistsToGalleryWorks([artistWith([{ ...work }])]);
    expect(g.revenueSharePercent).toBe(25);
  });

  it("carries a listed fee to the card, and null when there is none", () => {
    const [withFee, withoutFee] = artistsToGalleryWorks([
      artistWith([{ ...work, paidLoanMonthlyGbp: 40 }, { ...work, id: "w2" }]),
    ]);
    expect(withFee.paidLoanMonthlyGbp).toBe(40);
    expect(withoutFee.paidLoanMonthlyGbp).toBeNull();
  });
});
