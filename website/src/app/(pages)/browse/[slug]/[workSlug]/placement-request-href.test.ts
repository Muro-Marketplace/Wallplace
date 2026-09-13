import { describe, expect, it } from "vitest";
import { placementRequestHref } from "./placement-request-href";

describe("placementRequestHref", () => {
  it("links to the venue request form for this work, with the selected size", () => {
    const href = placementRequestHref({
      artistSlug: "alice-rivers",
      artistName: "Alice Rivers",
      workTitle: "Winter Field",
      workImage: "https://example.test/w1.jpg",
      sizeLabel: '12×16" (A3)',
    });
    const url = new URL(href, "https://wallplace.test");
    expect(url.pathname).toBe("/venue-portal/placements");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      artist: "alice-rivers",
      artistName: "Alice Rivers",
      work: "Winter Field",
      workImage: "https://example.test/w1.jpg",
      size: '12×16" (A3)',
    });
  });

  it("leaves the size out when none is selected", () => {
    const href = placementRequestHref({ artistSlug: "a", artistName: "A", workTitle: "W", workImage: "", sizeLabel: null });
    expect(new URL(href, "https://wallplace.test").searchParams.has("size")).toBe(false);
  });
});
