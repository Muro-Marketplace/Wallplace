// Owner report 13 September 2026: "QR Only" sat among the sizes, so choosing it
// shrank an Editorial label to 25mm instead of printing just the code. Size and
// style are separate choices now, and every combination has to fit the sheet.
import { describe, expect, it } from "vitest";
import {
  LABEL_SIZES,
  LABEL_STYLES,
  SHEET_HEIGHT_MM,
  SHEET_WIDTH_MM,
  labelDims,
  sheetLayout,
  toLabelSize,
  typeScale,
} from "./label-layout";

describe("label sizes and styles", () => {
  it("offers Small, Medium, Large and Extra Large as sizes, and QR Only only as a style", () => {
    expect(LABEL_SIZES.map((s) => s.label)).toEqual(["Small", "Medium", "Large", "Extra Large"]);
    expect(LABEL_STYLES.map((s) => s.name)).toEqual(["Minimal", "Editorial", "QR Only"]);
  });

  it("fits every style at every size on the printable A4 area, one label at least", () => {
    for (const { key: style } of LABEL_STYLES) {
      for (const { key: size } of LABEL_SIZES) {
        const layout = sheetLayout(size, style);
        const name = `${style} ${size}`;
        expect(layout.cols * layout.widthMm, `${name} width`).toBeLessThanOrEqual(SHEET_WIDTH_MM);
        expect(layout.rows * layout.heightMm, `${name} height`).toBeLessThanOrEqual(SHEET_HEIGHT_MM);
        expect(layout.perPage, name).toBe(layout.cols * layout.rows);
        expect(layout.perPage, name).toBeGreaterThanOrEqual(1);
        expect(layout.qrMm, `${name} QR`).toBeLessThan(Math.min(layout.widthMm, layout.heightMm));
      }
    }
  });

  it("makes a QR Only label a square that grows with the size, from 25mm", () => {
    const sides = LABEL_SIZES.map(({ key }) => labelDims(key, "qr_only"));
    expect(sides.every((d) => d.widthMm === d.heightMm)).toBe(true);
    expect(sides[0].widthMm).toBe(25);
    for (let i = 1; i < sides.length; i++) expect(sides[i].widthMm).toBeGreaterThan(sides[i - 1].widthMm);
  });

  it("keeps Minimal landscape and turns Editorial portrait", () => {
    expect(labelDims("medium", "minimal")).toMatchObject({ widthMm: 70, heightMm: 50 });
    expect(labelDims("medium", "editorial")).toMatchObject({ widthMm: 50, heightMm: 70 });
  });

  it("reads an unknown or retired size, such as the old micro, as Small", () => {
    expect(toLabelSize("large")).toBe("large");
    expect(toLabelSize("micro")).toBe("small");
    expect(toLabelSize(undefined)).toBe("small");
  });

  // Owner follow-up, 13 September 2026: Extra Large set its writing at Large's
  // sizes, so on a card a third bigger it looked lost.
  it("sets Extra Large's type a third bigger than Large's in every style, and leaves the other sizes alone", () => {
    for (const { key: style } of LABEL_STYLES) {
      expect(typeScale("xlarge", style), style).toBeCloseTo(4 / 3, 5);
      for (const size of ["small", "medium", "large"] as const) {
        expect(typeScale(size, style), `${style} ${size}`).toBe(1);
      }
    }
  });
});
