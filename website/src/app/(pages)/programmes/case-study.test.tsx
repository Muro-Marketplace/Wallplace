// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { CASE_STUDY } from "./ProgrammesClient";

// Launch audit, section 05. Every "proof" photo on the site was a before
// shot and the only testimonial was attributed to Wallplace itself. This
// slot renders nothing until the owner supplies a real installation (A5),
// so the page can never show a fabricated case.
describe("CASE_STUDY", () => {
  it("is null or complete", () => {
    if (CASE_STUDY === null) return;
    expect(CASE_STUDY.image).toMatch(/^\/images\/programmes\/case-study-/);
    for (const key of ["venue", "quote", "attribution"] as const) {
      expect(CASE_STUDY[key].trim()).not.toBe("");
    }
  });
});

import { PROOF_GRID_COLS, PROOF_PLACEMENTS } from "./ProgrammesClient";

// R7, 10 September 2026. venues-qr-scan.webp was pulled from this array: it
// read as generated imagery, sitting on a page whose site carries a "No AI
// art" badge and whose artist agreement makes every artist warrant their work
// is not AI-generated.
//
// Removing it took the array from three to two, and the grid was a hardcoded
// md:grid-cols-3, which would have left a hole where the third image was. The
// column count is a lookup on the array length instead. This holds the two in
// step, so adding a replacement photograph back is a one-line change that
// cannot silently mis-lay the grid.
describe("the proof-placement grid fits the images it has", () => {
  it("has a column class for however many images there are", () => {
    expect(PROOF_GRID_COLS[PROOF_PLACEMENTS.length]).toBeTruthy();
  });

  it("asks for exactly as many columns as there are images", () => {
    expect(PROOF_GRID_COLS[PROOF_PLACEMENTS.length]).toBe(
      `md:grid-cols-${PROOF_PLACEMENTS.length}`,
    );
  });

  it("does not carry the pulled QR image", () => {
    const sources = PROOF_PLACEMENTS.map((p) => p.src);
    expect(sources).not.toContain("/images/programmes/venues-qr-scan.webp");
  });

  it("gives every image real alt text, since none of them carry a caption", () => {
    for (const placement of PROOF_PLACEMENTS) {
      expect(placement.alt.trim().length).toBeGreaterThan(20);
    }
  });
});
