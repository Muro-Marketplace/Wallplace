// 05 E41-d. The frame-options payload must carry pricesBySize (per-size uplift
// overrides); the old inline map dropped it, wiping per-size frame pricing on save.

import { describe, expect, it } from "vitest";
import { buildFramePayload, firstUnnamedFrame } from "./frame-payload";

describe("buildFramePayload (E41-d)", () => {
  it("carries pricesBySize through, not just label/priceUplift/imageUrl", () => {
    const out = buildFramePayload([
      { label: "Oak", priceUplift: 20, imageUrl: "u", pricesBySize: { Medium: 12, Large: 18 } },
    ]);
    expect(out).toEqual([
      { label: "Oak", priceUplift: 20, imageUrl: "u", pricesBySize: { Medium: 12, Large: 18 } },
    ]);
  });

  it("coerces a string priceUplift to a finite number (the API rejects strings)", () => {
    expect(buildFramePayload([{ label: "Oak", priceUplift: "15" }])[0].priceUplift).toBe(15);
    // Non-numeric strings fall back to 0 rather than NaN.
    expect(buildFramePayload([{ label: "Oak", priceUplift: "abc" }])[0].priceUplift).toBe(0);
  });

  it("leaves pricesBySize undefined when the frame has none (no phantom key)", () => {
    const out = buildFramePayload([{ label: "Oak", priceUplift: 10 }]);
    expect(out[0].pricesBySize).toBeUndefined();
  });

  it("returns [] for undefined frameOptions", () => {
    expect(buildFramePayload(undefined)).toEqual([]);
  });
});

// Owner report 13 September 2026: a custom frame given a price but no name was
// dropped when the work saved, without a word. Saving now stops and says which
// frame needs a name; a completely empty row is still just an unused row.
describe("firstUnnamedFrame (owner report 13 September 2026)", () => {
  it("finds a frame with a price but no name", () => {
    expect(firstUnnamedFrame([{ label: "Oak", priceUplift: "10" }, { label: "", priceUplift: "15" }])).toBe(1);
  });

  it("counts a photo or a per-size price as something to save, and a blank name as no name", () => {
    expect(firstUnnamedFrame([{ label: "  ", priceUplift: "", imageUrl: "https://cdn/f.png" }])).toBe(0);
    expect(firstUnnamedFrame([{ label: "", priceUplift: "", pricesBySize: { A4: "12" } }])).toBe(0);
  });

  it("ignores an empty row and named frames", () => {
    expect(firstUnnamedFrame([{ label: "", priceUplift: "" }, { label: "Walnut", priceUplift: "20" }])).toBe(-1);
    expect(firstUnnamedFrame(undefined)).toBe(-1);
  });
});
