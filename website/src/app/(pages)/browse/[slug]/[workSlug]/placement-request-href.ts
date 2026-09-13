/**
 * The venue's "Request Placement" link from a work page. It carries the size
 * the visitor has selected, so the request opens on that size's fee (spec
 * 2026-09-13, per-size loan fees).
 */
export function placementRequestHref(input: {
  artistSlug: string;
  artistName: string;
  workTitle: string;
  workImage: string;
  sizeLabel?: string | null;
}): string {
  const params = new URLSearchParams({
    artist: input.artistSlug,
    artistName: input.artistName,
    work: input.workTitle,
    workImage: input.workImage,
  });
  if (input.sizeLabel) params.set("size", input.sizeLabel);
  return `/venue-portal/placements?${params.toString()}`;
}
