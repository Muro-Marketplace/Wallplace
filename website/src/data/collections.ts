export interface ArtistCollection {
  id: string;
  artistSlug: string;
  artistName: string;
  name: string;
  description?: string;
  workIds: string[];
  bundlePrice: number;
  bundlePriceBand: string;
  coverImage: string;
  available: boolean;
}

export const collections: ArtistCollection[] = [];

export function getCollectionById(id: string): ArtistCollection | undefined {
  return collections.find((c) => c.id === id);
}

export function getCollectionsByArtist(artistSlug: string): ArtistCollection[] {
  return collections.filter((c) => c.artistSlug === artistSlug);
}
