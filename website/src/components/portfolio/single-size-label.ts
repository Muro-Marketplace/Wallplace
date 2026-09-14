import { displayPhysicalDimensions } from "@/lib/dimensions";

/** The name a lone unnamed size saves under: the artwork's physical size, or
 *  "Original" when there is none (a pixel count is not a size). */
export function singleSizeName(dimensions: string | null | undefined): string {
  return displayPhysicalDimensions(dimensions) ?? "Original";
}

/**
 * The sizes a work saves with. An original has one size, and asking for its name
 * twice, as the artwork size and again as a size row, was print-first friction
 * (owner request 14 September 2026). So when exactly one row has a price and no
 * name, that row takes the artwork's physical size, or "Original" when there is
 * none (a pixel count is not a size). Order and length are kept, so the per-size
 * columns stay aligned by index; anything else comes back as it was.
 */
export function withSingleSizeLabel<T extends { label: string; price: number }>(
  sizes: T[],
  dimensions: string | null | undefined,
): T[] {
  const priced = sizes.filter((s) => s.price > 0);
  if (priced.length !== 1 || priced[0].label.trim()) return sizes;
  const label = singleSizeName(dimensions);
  return sizes.map((s) => (s === priced[0] ? { ...s, label } : s));
}

/**
 * The rows as they stand before another size joins them. A lone unnamed row stands
 * for the artwork size, which stops being true once it has company, so it takes
 * that name first and the artist can see what it became (owner report 14 September
 * 2026). Anything else comes back as it was.
 */
export function beforeAnotherSize<T extends { label: string }>(
  sizes: T[],
  dimensions: string | null | undefined,
): T[] {
  if (sizes.length !== 1 || sizes[0].label.trim()) return sizes;
  return [{ ...sizes[0], label: singleSizeName(dimensions) }];
}
