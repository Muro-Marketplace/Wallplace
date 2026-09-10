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

// R7, 10 September 2026. The grid was a hardcoded md:grid-cols-3 while the
// image list was a free-standing array, so changing one and not the other laid
// the grid out with a hole in it. That is not hypothetical: this array went to
// two entries and back to three within the day.
//
// The column count is a lookup on the array length now. These hold the two in
// step, so adding or removing a photograph stays a one-line change.
describe("the proof-placement grid fits the images it has", () => {
  it("has a column class for however many images there are", () => {
    expect(PROOF_GRID_COLS[PROOF_PLACEMENTS.length]).toBeTruthy();
  });

  it("asks for exactly as many columns as there are images", () => {
    expect(PROOF_GRID_COLS[PROOF_PLACEMENTS.length]).toBe(
      `md:grid-cols-${PROOF_PLACEMENTS.length}`,
    );
  });

  it("has a column class for every count the array could plausibly take", () => {
    for (const n of [1, 2, 3]) {
      expect(PROOF_GRID_COLS[n]).toBe(`md:grid-cols-${n}`);
    }
  });

  it("names each image once, so no src is rendered twice", () => {
    const sources = PROOF_PLACEMENTS.map((p) => p.src);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("gives every image real alt text, since none of them carry a caption", () => {
    for (const placement of PROOF_PLACEMENTS) {
      expect(placement.alt.trim().length).toBeGreaterThan(20);
    }
  });
});
