// @vitest-environment jsdom
// Owner follow-up, 13 September 2026: an Editorial title split "Vil-lage" across
// two lines, and Minimal ignored the rows its tick boxes asked for.
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import QRLabel from "./QRLabel";

afterEach(() => cleanup());

const work = {
  artistName: "Fin Coles",
  workTitle: "Vietnamese Village",
  workMedium: "Photography Print",
  workDimensions: "30 × 40 cm",
  workPrice: "From £29.99",
  qrDataUrl: "data:image/png;base64,AAAA",
};

describe("<QRLabel />", () => {
  it("never hyphenates or splits a word to fill a line", () => {
    const source = readFileSync(path.join(__dirname, "QRLabel.tsx"), "utf8");
    expect(source).not.toMatch(/hyphens:\s*["']auto["']/);
    expect(source).not.toMatch(/wordBreak:\s*["']break-(word|all)["']/);
  });

  it("prints the rows a Minimal label has ticked, and only those", () => {
    render(<QRLabel {...work} labelStyle="minimal" showMedium showDimensions={false} showPrice />);
    expect(screen.getByText("Photography Print")).toBeTruthy();
    expect(screen.getByText("From £29.99")).toBeTruthy();
    expect(screen.queryByText("30 × 40 cm")).toBeNull();
  });

  it("prints no rows on a QR Only label, whatever is ticked", () => {
    render(<QRLabel {...work} labelStyle="qr_only" showMedium showDimensions showPrice />);
    for (const text of ["Photography Print", "30 × 40 cm", "From £29.99", "Vietnamese Village"]) {
      expect(screen.queryByText(text), text).toBeNull();
    }
  });
});
