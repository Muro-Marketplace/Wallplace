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

  it("carries the lowest per-size fee to the card, and whether the sizes differ", () => {
    const [varies, single, none] = artistsToGalleryWorks([
      artistWith([
        {
          ...work,
          pricing: [
            { label: "A4", price: 100, paidLoanMonthlyGbp: 40 },
            { label: "A3", price: 200, paidLoanMonthlyGbp: 25 },
          ],
        },
        { ...work, id: "w2", pricing: [{ label: "A4", price: 100, paidLoanMonthlyGbp: 40 }] },
        { ...work, id: "w3" },
      ]),
    ]);
    expect(varies).toMatchObject({ paidLoanFromGbp: 25, paidLoanFeesVary: true });
    expect(single).toMatchObject({ paidLoanFromGbp: 40, paidLoanFeesVary: false });
    expect(none).toMatchObject({ paidLoanFromGbp: null, paidLoanFeesVary: false });
  });
});

describe("artistsToGalleryWorks: per-work ticks (migration 149)", () => {
  it("uses a work's own ticks for the arrangement flags the card and the filters read", () => {
    const artist = {
      ...artistWith([
        { ...work, openToFreeLoanOverride: true, openToRevenueShareOverride: false },
        { ...work, id: "w2" },
      ]),
      openToFreeLoan: false,
      openToRevenueShare: true,
    } as Artist;
    const [own, follows] = artistsToGalleryWorks([artist]);
    expect(own).toMatchObject({ openToFreeLoan: true, openToRevenueShare: false, revenueSharePercent: 0 });
    expect(follows).toMatchObject({ openToFreeLoan: false, openToRevenueShare: true, revenueSharePercent: 25 });
  });
});
