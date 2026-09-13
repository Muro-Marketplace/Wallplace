// Frame-options payload builder for POST /api/artist-works, extracted from the
// portfolio page so it can be unit-tested without rendering the whole editor.
//
// E41-d: this map used to carry only label / priceUplift / imageUrl, silently
// dropping `pricesBySize` (the artist's per-size uplift overrides). Because a save
// re-POSTs the edited work, that wiped per-size frame pricing on every save. The
// column exists in the form state, is rehydrated on edit, and is persisted by the
// API — this transform was the only thing losing it.

export interface FramePayloadInput {
  label: string;
  /** May arrive as a string from the form inputs; coerced to a number below. */
  priceUplift: number | string;
  imageUrl?: string;
  /** Per-size uplift overrides, keyed by size label. */
  pricesBySize?: Record<string, number>;
}

export interface FramePayload {
  label: string;
  priceUplift: number;
  imageUrl?: string;
  pricesBySize?: Record<string, number>;
}

/**
 * Build the frame-options array the API expects. priceUplift is coerced to a finite
 * number (the API's validator rejects strings, which used to silently sanitise the
 * frame away), and pricesBySize is carried through unchanged.
 */
export function buildFramePayload(frameOptions: FramePayloadInput[] | undefined): FramePayload[] {
  return (frameOptions ?? []).map((f) => ({
    label: f.label,
    priceUplift: typeof f.priceUplift === "number" ? f.priceUplift : Number(f.priceUplift) || 0,
    imageUrl: f.imageUrl,
    pricesBySize: f.pricesBySize,
  }));
}

/**
 * The index of the first frame the artist started but left without a name, or
 * -1. Something to save means a price, a photo or a per-size price; a completely
 * empty row is an unused "+ Add frame option" and does not count. Buyers choose a
 * frame by its name, and saving used to drop an unnamed frame without a word
 * (owner report 13 September 2026), so the save stops and says which one.
 */
export function firstUnnamedFrame(
  frameOptions:
    | Array<{
        label: string;
        priceUplift?: number | string;
        imageUrl?: string;
        pricesBySize?: Record<string, number | string | undefined>;
      }>
    | undefined,
): number {
  return (frameOptions ?? []).findIndex((f) => {
    if (f.label.trim()) return false;
    const priced = Number(f.priceUplift) > 0;
    const pictured = !!f.imageUrl;
    const sizePriced = Object.values(f.pricesBySize ?? {}).some((v) => v !== undefined && v !== "");
    return priced || pictured || sizePriced;
  });
}
