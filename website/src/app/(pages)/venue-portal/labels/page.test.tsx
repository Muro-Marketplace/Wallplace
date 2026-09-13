// @vitest-environment jsdom
// Owner decision 2026-09-02: QR label colour is free for every plan,
// venues included, and now has a picker here (this page never had one
// before). Venues have no saved-profile theme column, so the choice lives
// only in component state for the current print run, nothing is persisted.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const { authFetchMock, labelPreviewProps } = vi.hoisted(() => ({
  authFetchMock: vi.fn(),
  labelPreviewProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/VenuePortalLayout", () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/api-client", () => ({ authFetch: authFetchMock }));
// Mocked so we can assert on exactly what reaches it, per the task brief.
vi.mock("@/components/labels/LabelPreview", () => ({
  default: (props: Record<string, unknown>) => {
    labelPreviewProps.push(props);
    return null;
  },
}));

import VenueLabelsPage from "./page";
import { _resetFeedbackBubbleVisibility, isFeedbackBubbleHidden } from "@/lib/ui/feedback-bubble-visibility";

const PLACEMENTS = [
  {
    id: "p1",
    work_title: "Sunset Over the Bay",
    work_image: "https://example.com/sunset.jpg",
    work_size: "40x50cm",
    artist_slug: "james-okafor",
    venue: "The Curzon",
    status: "active",
  },
];

function jsonResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

afterEach(() => cleanup());
beforeEach(() => {
  authFetchMock.mockReset();
  labelPreviewProps.length = 0;
  authFetchMock.mockImplementation((url: string) => {
    if (url === "/api/placements") return jsonResponse({ placements: PLACEMENTS });
    if (url === "/api/venue-profile") return jsonResponse({ profile: { name: "The Curzon", slug: "the-curzon" } });
    return jsonResponse({});
  });
});

describe("venue labels page — label colour picker (owner decision 2026-09-02)", () => {
  it("shows a Label colour picker with all four themes, defaulting to classic", async () => {
    render(<VenueLabelsPage />);
    await screen.findByText("Sunset Over the Bay");

    expect(screen.getByText("Label colour")).toBeTruthy();
    for (const label of ["Classic (white)", "Warm cream", "Dark", "Accent"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Classic (white)" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("choosing a colour reaches LabelPreview immediately; nothing is persisted", async () => {
    render(<VenueLabelsPage />);
    await screen.findByText("Sunset Over the Bay");

    fireEvent.click(await screen.findByText("Preview & Print"));
    expect(labelPreviewProps.at(-1)?.labelTheme).toBe("classic");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(labelPreviewProps.at(-1)?.labelTheme).toBe("dark");

    // Venues have no saved theme column, only /api/placements and
    // /api/venue-profile / /api/browse-artists are ever called, never a
    // profile-update write for the colour choice.
    await waitFor(() => expect(authFetchMock).toHaveBeenCalled());
    const calledUrls = authFetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).not.toContain("/api/artist-profile");
    expect(calledUrls).not.toContain("/api/venue-profile-theme");
  });
});

// LA-C035 (launch audit 2026-09-05). The placements request had no res.ok check
// (authFetch resolves on a non-2xx), so a failed load became an empty list and
// the page told a venue with live placements "No active placements yet".
describe("venue labels when the placements request fails (LA-C035)", () => {
  it("shows an error with a retry instead of 'No active placements yet'", async () => {
    authFetchMock.mockImplementation((url: string) => {
      if (url === "/api/placements") return Promise.resolve(new Response(JSON.stringify({ error: "boom" }), { status: 500 }));
      return jsonResponse({});
    });
    render(<VenueLabelsPage />);
    expect(await screen.findByText(/could not load your placements/i)).toBeTruthy();
    expect(screen.queryByText("No active placements yet")).toBeNull();

    authFetchMock.mockImplementation((url: string) => {
      if (url === "/api/placements") return jsonResponse({ placements: PLACEMENTS });
      if (url === "/api/venue-profile") return jsonResponse({ profile: { name: "The Curzon", slug: "the-curzon" } });
      return jsonResponse({});
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Sunset Over the Bay")).toBeTruthy();
  });
});

// Owner report 13 September 2026, on the same screens as the artist side.
describe("venue labels page: tick boxes, sizes and the action bar (owner report 13 September 2026)", () => {
  beforeEach(() => _resetFeedbackBubbleVisibility());

  const styleGroup = () => screen.getByRole("group", { name: "Label style" });
  const sizeGroup = () => screen.getByRole("group", { name: "Label size" });

  // Owner follow-up, 13 September 2026: Minimal needs its tick boxes too; only QR
  // Only, which prints nothing but the code, goes without.
  it("shows the Medium, Dimensions and Price tick boxes for Minimal and Editorial, not QR Only", async () => {
    render(<VenueLabelsPage />);
    await screen.findByText("Sunset Over the Bay");
    expect(screen.getByRole("checkbox", { name: "Price" })).toBeTruthy();

    fireEvent.click(within(styleGroup()).getByRole("button", { name: /^Editorial/ }));
    expect(screen.getByRole("checkbox", { name: "Price" })).toBeTruthy();

    fireEvent.click(within(styleGroup()).getByRole("button", { name: /^QR Only/ }));
    expect(screen.queryByRole("checkbox", { name: "Price" })).toBeNull();
  });

  it("offers Small to Extra Large as sizes, with QR Only as a style", async () => {
    render(<VenueLabelsPage />);
    await screen.findByText("Sunset Over the Bay");
    expect(within(styleGroup()).getByRole("button", { name: /^QR Only/ })).toBeTruthy();
    expect(within(sizeGroup()).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Small",
      "Medium",
      "Large",
      "Extra Large",
    ]);
  });

  it("prints the agreed placement size and keeps a colour chosen in the preview", async () => {
    render(<VenueLabelsPage />);
    await screen.findByText("Sunset Over the Bay");
    fireEvent.click(await screen.findByText("Preview & Print"));

    const props = labelPreviewProps.at(-1)!;
    const [work] = props.labels as Array<Record<string, unknown>>;
    expect(work.workDimensions).toBe("40x50cm");
    expect(work.sizeOptions).toEqual(["40x50cm"]);
    expect(props).not.toHaveProperty("availableSizes");

    act(() => (props.onLabelThemeChange as (id: string) => void)("dark"));
    expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true");
  });

  // Now Minimal prints ticked rows, a style changed in the preview must bring its
  // tick boxes back too, or the next preview prints rows this one had cleared.
  it("brings the tick boxes back from a style chosen in the preview, keeping the size", async () => {
    render(<VenueLabelsPage />);
    await screen.findByText("Sunset Over the Bay");
    fireEvent.click(await screen.findByText("Preview & Print"));
    const price = () => screen.getByRole("checkbox", { name: "Price" }) as HTMLInputElement;
    const pressedSize = () =>
      within(sizeGroup()).getAllByRole("button").find((b) => b.getAttribute("aria-pressed") === "true")?.textContent;
    const sizeBefore = pressedSize();
    expect(price().checked).toBe(false);

    act(() => (labelPreviewProps.at(-1)!.onLabelStyleChange as (style: string) => void)("editorial"));
    expect(price().checked).toBe(true);
    expect(pressedSize()).toBe(sizeBefore);

    act(() => (labelPreviewProps.at(-1)!.onLabelStyleChange as (style: string) => void)("minimal"));
    expect(price().checked).toBe(false);
  });

  it("hides the Feedback button while the Preview & Print bar is on screen", async () => {
    render(<VenueLabelsPage />);
    expect(await screen.findByText("Preview & Print")).toBeTruthy();
    expect(isFeedbackBubbleHidden()).toBe(true);

    fireEvent.click(screen.getByText("Clear"));
    await waitFor(() => expect(isFeedbackBubbleHidden()).toBe(false));
  });
});
