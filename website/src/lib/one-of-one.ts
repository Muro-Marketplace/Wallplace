/**
 * Buyer-facing wording for a one-off work. Owner request 14 September 2026: a
 * single painting read "1 available" and "Only 1 left at this size", which is how
 * a print shop talks. A work with one size and a quantity of 1 is a one-off:
 * "Original, one of one", or "One of one" when its medium says it is a print.
 * Null for anything else, so callers keep their usual stock wording.
 */
export function oneOfOneLabel(work: {
  medium?: string | null;
  quantityAvailable?: number | null;
  pricing?: ReadonlyArray<{ quantityAvailable?: number | null }> | null;
}): string | null {
  const sizes = work.pricing ?? [];
  if (sizes.length !== 1) return null;
  const perSize = sizes[0].quantityAvailable;
  const quantity = typeof perSize === "number" ? perSize : work.quantityAvailable;
  if (quantity !== 1) return null;
  return /print|gicl[eé]e/i.test(work.medium ?? "") ? "One of one" : "Original, one of one";
}
