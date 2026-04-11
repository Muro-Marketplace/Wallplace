import { artists, type Artist, type WorkOrientation, type SizePricing } from "./artists";

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
}

/** Build gallery works from static seed data (fallback) */
export function getGalleryWorks(): GalleryWork[] {
  return artistsToGalleryWorks(artists);
}

/** Build gallery works from any artist list (merged static + DB) */
export function artistsToGalleryWorks(allArtists: Artist[]): GalleryWork[] {
  return allArtists.flatMap((artist) =>
    artist.works.map((work) => ({
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
    }))
  );
}
