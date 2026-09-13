// Owner request 14 September 2026: an original has one size, and asking for its
// name twice, once as the artwork size and again as a size row, was print-first
// friction. A lone priced row with no name takes the artwork size.
import { describe, expect, it } from "vitest";
import { withSingleSizeLabel } from "./single-size-label";

describe("withSingleSizeLabel", () => {
  it("names a lone priced row after the artwork size", () => {
    expect(withSingleSizeLabel([{ label: "", price: 1200 }], "70 × 50 cm")).toEqual([
      { label: "70 × 50 cm", price: 1200 },
    ]);
  });

  it("uses Original when there is no physical size to name it after", () => {
    expect(withSingleSizeLabel([{ label: "  ", price: 1200 }], "")).toEqual([{ label: "Original", price: 1200 }]);
    expect(withSingleSizeLabel([{ label: "", price: 1200 }], "4032 × 2880 px")).toEqual([
      { label: "Original", price: 1200 },
    ]);
  });

  it("leaves named rows, unpriced rows and several priced rows alone", () => {
    const named = [{ label: "A3", price: 90 }];
    expect(withSingleSizeLabel(named, "70 × 50 cm")).toBe(named);
    const unpriced = [{ label: "", price: 0 }];
    expect(withSingleSizeLabel(unpriced, "70 × 50 cm")).toBe(unpriced);
    const two = [{ label: "", price: 50 }, { label: "", price: 80 }];
    expect(withSingleSizeLabel(two, "70 × 50 cm")).toBe(two);
  });

  it("keeps every row in its place, so the per-size columns stay aligned", () => {
    const rows = [{ label: "", price: 0 }, { label: "", price: 300 }];
    const out = withSingleSizeLabel(rows, "40 × 30 cm");
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(rows[0]);
    expect(out[1]).toEqual({ label: "40 × 30 cm", price: 300 });
  });
});
