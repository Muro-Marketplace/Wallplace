import { describe, expect, it } from "vitest";
import { dbProfileToArtist, type DbArtistProfile, type DbArtistWork } from "./artist-profiles-transform";

const profile = {
  id: "ap_1",
  user_id: "u_1",
  slug: "a",
  name: "A",
  revenue_share_percent: 25,
  open_to_free_loan: true,
  open_to_revenue_share: true,
  open_to_outright_purchase: true,
} as unknown as DbArtistProfile;

const row = {
  id: "w1",
  artist_id: "ap_1",
  title: "Harbour Light",
  medium: "",
  dimensions: "",
  price_band: "",
  pricing: [],
  available: true,
  color: "",
  image: "/w1.jpg",
  orientation: "landscape",
  sort_order: 0,
} as DbArtistWork;

describe("dbProfileToArtist: per-work terms (migration 148)", () => {
  it("keeps a work's own terms separate from the artist's default", () => {
    const artist = dbProfileToArtist(profile, [{ ...row, revenue_share_percent: 30, paid_loan_monthly_gbp: 40 }]);
    expect(artist.works[0].revenueShareOverride).toBe(30);
    expect(artist.works[0].paidLoanMonthlyGbp).toBe(40);
    expect(artist.revenueSharePercent).toBe(25);
  });

  it("reads unset columns as null, which means the default applies", () => {
    const artist = dbProfileToArtist(profile, [row]);
    expect(artist.works[0].revenueShareOverride).toBeNull();
    expect(artist.works[0].paidLoanMonthlyGbp).toBeNull();
  });
});
