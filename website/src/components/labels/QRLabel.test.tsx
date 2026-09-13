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

  // Owner follow-up, 13 September 2026: Extra Large set its writing at Large's
  // sizes, so on a card a third bigger it looked lost.
  it("sets every line of writing bigger on Extra Large than on Large, in every style", () => {
    const fontPt = (el: HTMLElement) => {
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        if (node.style.fontSize) return parseFloat(node.style.fontSize);
      }
      throw new Error(`no font size above "${el.textContent}"`);
    };
    const measure = (labelStyle: "minimal" | "editorial" | "qr_only", labelSize: "large" | "xlarge") => {
      const { unmount } = render(
        <QRLabel {...work} labelStyle={labelStyle} labelSize={labelSize} tagline="Shot on film in Hoi An" />,
      );
      const texts =
        labelStyle === "qr_only"
          ? ["wallplace.co.uk"]
          : ["Fin Coles", "Vietnamese Village", "Photography Print", "From £29.99", "Shot on film in Hoi An", "wallplace.co.uk"];
      const sizes = Object.fromEntries(texts.map((text) => [text, fontPt(screen.getByText(text))]));
      unmount();
      return sizes;
    };

    for (const style of ["minimal", "editorial", "qr_only"] as const) {
      const large = measure(style, "large");
      const xlarge = measure(style, "xlarge");
      for (const text of Object.keys(large)) {
        expect(xlarge[text], `${style}: ${text}`).toBeGreaterThan(large[text]);
      }
    }
  });
});
