// 05 E41-c. A save must POST only the works that changed, not the whole portfolio.

import { describe, expect, it } from "vitest";
import { worksToPost } from "./changed-works";
import type { ArtistWork } from "@/data/artists";

const w = (id: string, over: Partial<ArtistWork> = {}): ArtistWork =>
  ({
    id,
    title: `T-${id}`,
    medium: "Oil",
    dimensions: "10x10",
    priceBand: "From £10",
    pricing: [{ label: "S", price: 10 }],
    available: true,
    color: "#000",
    image: `img-${id}`,
    orientation: "landscape",
    ...over,
  }) as ArtistWork;

describe("worksToPost (E41-c)", () => {
  it("returns only the work whose fields changed, with its index", () => {
    const persisted = [w("a"), w("b"), w("c")];
    const updated = [w("a"), w("b", { pricing: [{ label: "S", price: 99 }] }), w("c")];
    const out = worksToPost(updated, persisted);
    expect(out.map((x) => x.work.id)).toEqual(["b"]);
    expect(out[0].index).toBe(1);
  });

  it("includes a brand-new work that has no persisted match", () => {
    expect(worksToPost([w("a"), w("b"), w("c")], [w("a"), w("b")]).map((x) => x.work.id)).toEqual(["c"]);
  });

  it("returns [] when nothing changed", () => {
    expect(worksToPost([w("a"), w("b")], [w("a"), w("b")])).toEqual([]);
  });

  it("includes moved works on a reorder (sortOrder changed) but not the unmoved one", () => {
    const persisted = [w("a"), w("b"), w("c")];
    const updated = [w("b"), w("a"), w("c")]; // a and b swapped; c stays at index 2
    expect(worksToPost(updated, persisted).map((x) => x.work.id).sort()).toEqual(["a", "b"]);
  });

  it("detects a per-size shipping change carried on the work extras", () => {
    const persisted = [w("a")];
    const updated = [{ ...w("a"), shippingPrice: 5 } as ArtistWork];
    expect(worksToPost(updated, persisted).map((x) => x.work.id)).toEqual(["a"]);
  });
});

// Migration 148. A work whose only change is its revenue share or listed paid
// loan fee must still be re-POSTed. postKey used to omit both, so the editor
// showed the new value, marked it saved, and never sent it.
describe("worksToPost: per-work terms (migration 148)", () => {
  it("posts a work whose only change is its paid loan fee", () => {
    const out = worksToPost([w("a", { paidLoanMonthlyGbp: 40 })], [w("a", { paidLoanMonthlyGbp: null })]);
    expect(out.map((x) => x.work.id)).toEqual(["a"]);
  });

  it("posts a work whose only change is its revenue share", () => {
    const out = worksToPost([w("a", { revenueShareOverride: 30 })], [w("a")]);
    expect(out.map((x) => x.work.id)).toEqual(["a"]);
  });

  it("does not post a work whose terms are unchanged, treating missing and null alike", () => {
    const same = { revenueShareOverride: 30, paidLoanMonthlyGbp: 40 };
    expect(worksToPost([w("a", same)], [w("a", same)])).toEqual([]);
    expect(worksToPost([w("b", { paidLoanMonthlyGbp: null })], [w("b")])).toEqual([]);
  });
});
