import { displayPhysicalDimensions } from "@/lib/dimensions";

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
  const label = displayPhysicalDimensions(dimensions) ?? "Original";
  return sizes.map((s) => (s === priced[0] ? { ...s, label } : s));
}
