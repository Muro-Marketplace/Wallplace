// Owner request 14 September 2026: a single painting read "1 available" and
// "Only 1 left at this size" to buyers, which is print-shop copy. A work with one
// size and a quantity of 1 is a one-off, and says so.
import { describe, expect, it } from "vitest";
import { oneOfOneLabel } from "./one-of-one";

type Sizes = Array<{ label: string; price: number; quantityAvailable?: number }>;

const work = (over: { medium?: string; quantityAvailable?: number | null; pricing?: Sizes } = {}) => ({
  medium: "Oil on canvas",
  quantityAvailable: 1 as number | null,
  pricing: [{ label: "70 × 50 cm", price: 1200 }] as Sizes,
  ...over,
});

describe("oneOfOneLabel", () => {
  it("calls a single-size work with a quantity of 1 an original, one of one", () => {
    expect(oneOfOneLabel(work())).toBe("Original, one of one");
  });

  it("reads a per-size quantity of 1 the same way", () => {
    expect(
      oneOfOneLabel(work({ quantityAvailable: null, pricing: [{ label: "A3", price: 90, quantityAvailable: 1 }] })),
    ).toBe("Original, one of one");
  });

  it("does not call a print an original", () => {
    expect(oneOfOneLabel(work({ medium: "Photography Print" }))).toBe("One of one");
    expect(oneOfOneLabel(work({ medium: "Giclée print" }))).toBe("One of one");
  });

  it("says nothing for several sizes, more than one, none left, or unlimited", () => {
    expect(oneOfOneLabel(work({ pricing: [{ label: "A4", price: 50 }, { label: "A3", price: 80 }] }))).toBeNull();
    expect(oneOfOneLabel(work({ quantityAvailable: 3 }))).toBeNull();
    expect(oneOfOneLabel(work({ quantityAvailable: 0 }))).toBeNull();
    expect(oneOfOneLabel(work({ quantityAvailable: null }))).toBeNull();
  });
});
