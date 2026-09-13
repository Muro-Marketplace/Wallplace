import { artists, type Artist, type WorkOrientation, type SizePricing } from "./artists";
import type { DisciplineId } from "./categories";
import { resolveWorkTerms } from "@/lib/work-terms";

export interface GalleryWork {
  id: string;
  title: string;
  artistName: string;
  artistSlug: string;
  medium: string;
  dimensions: string;
  priceBand: string;
  pricing: SizePricing[];
  available: boolean;
  image: string;
  themes: string[];
  orientation?: WorkOrientation;
  // Artist-level fields for filtering
  artistLocation: string;
  artistCoordinates: { lat: number; lng: number } | null;
  artistPrimaryMedium: string;
  artistDiscipline?: DisciplineId;
  artistSubStyles?: string[];
  offersOriginals: boolean;
  offersPrints: boolean;
  offersFramed: boolean;
  /** The work's own ticks (migration 149), else the artist's profile. The
   *  arrangement line, the Galleries filters and the terms line read these. */
  openToFreeLoan: boolean;
  openToRevenueShare: boolean;
  revenueSharePercent?: number;
  /** Lowest listed monthly paid loan fee across sizes, null for none. */
  paidLoanFromGbp?: number | null;
  /** True when sizes list different fees, so the card says "From". */
  paidLoanFeesVary?: boolean;
  openToOutrightPurchase: boolean;
  /** Artist's subscription plan, used to put Pro / Premium works
   *  first in the marketplace's "Featured" sort. Mirrors the Featured
   *  chip on the artist card. */
  artistSubscriptionPlan?: string;
  /** Founding-artist flag, secondary tiebreaker for Featured sort. */
  artistIsFounding?: boolean;
  featuredUntil?: string;
  /** Seed (sample) artist; drives the Sample pill on marketplace cards. */
  artistIsSeed?: boolean;
  /** ISO timestamp from `artist_works.created_at`. Powers the
   *  "Recently listed" sort on the marketplace (#5). */
  createdAt?: string;
}

/** Build gallery works from static seed data (fallback) */
export function getGalleryWorks(): GalleryWork[] {
  return artistsToGalleryWorks(artists);
}

/** Build gallery works from any artist list (merged static + DB) */
export function artistsToGalleryWorks(allArtists: Artist[]): GalleryWork[] {
  return allArtists.flatMap((artist) =>
    artist.works.map((work) => {
      // Spec 2026-09-13. This builder names every field and never spreads the
      // work, so a work field not named here never reaches the card.
      const terms = resolveWorkTerms(work, artist);
      return {
      id: work.id,
      title: work.title,
      artistName: artist.name,
      artistSlug: artist.slug,
      medium: work.medium,
      dimensions: work.dimensions,
      priceBand: work.priceBand,
      pricing: work.pricing,
      available: work.available,
      image: work.image,
      themes: artist.themes,
      orientation: work.orientation,
      artistLocation: artist.location,
      artistCoordinates: artist.coordinates,
      artistPrimaryMedium: artist.primaryMedium,
      artistDiscipline: artist.discipline,
      artistSubStyles: artist.subStyles,
      offersOriginals: artist.offersOriginals,
      offersPrints: artist.offersPrints,
      offersFramed: artist.offersFramed,
      openToFreeLoan: terms.openToFreeLoan,
      openToRevenueShare: terms.openToRevenueShare,
      revenueSharePercent: terms.revenueSharePercent,
      paidLoanFromGbp: terms.paidLoanFromGbp,
      paidLoanFeesVary: terms.paidLoanFeesVary,
      openToOutrightPurchase: artist.openToOutrightPurchase,
      artistSubscriptionPlan: artist.subscriptionPlan,
      artistIsFounding: artist.isFoundingArtist,
      featuredUntil: work.featuredUntil,
      artistIsSeed: artist.isSeedArtist,
      createdAt: work.createdAt,
      };
    })
  );
}
