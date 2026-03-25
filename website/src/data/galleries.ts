import { artists, type WorkOrientation } from "./artists";

export interface GalleryWork {
  id: string;
  title: string;
  artistName: string;
  artistSlug: string;
  medium: string;
  dimensions: string;
  priceBand: string;
  available: boolean;
  image: string;
  themes: string[];
  orientation?: WorkOrientation;
}

export function getGalleryWorks(): GalleryWork[] {
  return artists.flatMap((artist) =>
    artist.works.map((work, index) => ({
      id: `${artist.slug}-${index + 1}`,
      title: work.title,
      artistName: artist.name,
      artistSlug: artist.slug,
      medium: work.medium,
      dimensions: work.dimensions,
      priceBand: work.priceBand,
      available: work.available,
      image: work.image,
      themes: artist.themes,
      orientation: work.orientation,
    }))
  );
}
