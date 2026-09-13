/**
 * Where a venue's own placement request starts (spec 2026-09-13, per-size loan
 * fees). The venue ticks works on an artist's page and may pick a size for
 * each; the request opens at those works' advertised terms instead of a flat 0%
 * and £50. Kept out of the page so it can be tested without rendering it.
 */
import {
  initialPlacementTerms,
  type ArtistTermsInput,
  type InitialPlacementTerms,
  type WorkTermsInput,
} from "@/lib/work-terms";

export interface VenueRequestWork extends WorkTermsInput {
  title: string;
}

/**
 * @param selectedWorkSizes each ticked work's title and chosen size ("" for any
 *   size), in the order the venue ticked them, which is the order the request
 *   lists them.
 */
export function venueStartingTerms(
  works: ReadonlyArray<VenueRequestWork>,
  selectedWorkSizes: Readonly<Record<string, string>>,
  artist: ArtistTermsInput,
): InitialPlacementTerms {
  const selections = Object.entries(selectedWorkSizes).flatMap(([title, size]) => {
    const work = works.find((w) => w.title === title);
    return work ? [{ ...work, sizeLabel: size || null }] : [];
  });
  return initialPlacementTerms(selections, artist);
}
