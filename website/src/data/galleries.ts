import { artists, type WorkOrientation, type SizePricing } from "./artists";

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

export function getGalleryWorks(): GalleryWork[] {
  return artists.flatMap((artist) =>
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
