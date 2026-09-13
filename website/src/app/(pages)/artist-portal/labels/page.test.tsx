// @vitest-environment jsdom
// Owner decision 2026-09-02: QR label colour moved off Edit Profile (where
// it lived behind the Premium gate) onto this print-labels screen instead,
// free for every plan. The old "My theme / classic" toggle + Premium
// upsell are gone; a LabelThemePicker now drives LabelPreview directly and
// saves the artist's pick as their new default via mutate().

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const { mutateMock, authFetchMock, showToastMock, artistState, labelPreviewProps } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  authFetchMock: vi.fn(),
  showToastMock: vi.fn(),
  artistState: { artist: null as unknown },
  labelPreviewProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/ArtistPortalLayout", () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock("@/hooks/useCurrentArtist", () => ({
  useCurrentArtist: () => ({ artist: artistState.artist, loading: false, profileId: null, refetch: vi.fn() }),
}));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ showToast: showToastMock }) }));
// api-client.ts imports the real Supabase client module at load time, which
// throws without env vars. Stub it so requiring the *actual* api-client
// below (to keep the real ApiError/apiErrorMessage) doesn't blow up in test.
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {}, from: () => ({}) } }));
vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, authFetch: authFetchMock, mutate: mutateMock };
});
// Mocked so we can assert on exactly what reaches it, per the task brief.
// Captures every render's props so we can check both the initial value and
// the value after a colour change.
vi.mock("@/components/labels/LabelPreview", () => ({
  default: (props: Record<string, unknown>) => {
    labelPreviewProps.push(props);
    return null;
  },
}));

import LabelsPage from "./page";
import { artists } from "@/data/artists";
import { clearPortalGetCache } from "@/lib/portal-get";
import { _resetFeedbackBubbleVisibility, isFeedbackBubbleHidden } from "@/lib/ui/feedback-bubble-visibility";

afterEach(() => cleanup());
beforeEach(() => {
  // portalGet holds a resolved response briefly so a click can join the
  // request the sidebar hover started; it must not carry between tests.
  clearPortalGetCache();
  mutateMock.mockReset();
  authFetchMock.mockReset();
  showToastMock.mockReset();
  labelPreviewProps.length = 0;
  mutateMock.mockResolvedValue({});
  authFetchMock.mockResolvedValue(new Response(JSON.stringify({ placements: [] }), { status: 200 }));

  const base = artists[0];
  artistState.artist = {
    ...base,
    // Core, not Premium/Pro: label colour must still be fully available.
    subscriptionPlan: "core",
    labelTheme: "warm",
  };
});

/** Opens the print preview via the Portfolio Label "+" button, which is
 *  always present, so the test doesn't depend on work-card selection. */
function openPreview() {
  fireEvent.click(screen.getAllByText("+")[0]);
  fireEvent.click(screen.getByText("Preview & Print"));
}

describe("artist labels page — label colour picker (owner decision 2026-09-02)", () => {
  it("shows a Label colour picker with all four themes and no Premium upsell, even on a Core plan", async () => {
    render(<LabelsPage />);
    await screen.findByText("QR Labels");

    expect(screen.getByText("Label colour")).toBeTruthy();
    for (const label of ["Classic (white)", "Warm cream", "Dark", "Accent"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }

    expect(screen.queryByText(/Want coloured labels/)).toBeNull();
    expect(screen.queryByText(/Premium artists can pick/)).toBeNull();
    expect(screen.queryByText("Upgrade")).toBeNull();
    // The old toggle's exact button labels ("My theme" / bare "Classic"),
    // distinct from the swatch picker's "Classic (white)" swatch.
    expect(screen.queryByText("My theme")).toBeNull();
    expect(screen.queryByRole("button", { name: "Classic" })).toBeNull();
  });

  it("initialises the picker from the artist's saved labelTheme", async () => {
    render(<LabelsPage />);
    await screen.findByText("QR Labels");
    expect(screen.getByRole("button", { name: "Warm cream" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("choosing a colour reaches LabelPreview immediately and saves it as the new default via mutate", async () => {
    render(<LabelsPage />);
    await screen.findByText("QR Labels");

    openPreview();
    expect(labelPreviewProps.at(-1)?.labelTheme).toBe("warm");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    // Reaches the live preview straight away.
    expect(labelPreviewProps.at(-1)?.labelTheme).toBe("dark");

    // Persisted through the existing profile-update call, not authFetch.
    await waitFor(() => expect(mutateMock).toHaveBeenCalledWith(
      "/api/artist-profile",
      expect.objectContaining({ method: "PUT" }),
    ));
    const body = JSON.parse((mutateMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ label_theme: "dark" });
  });

  it("shows a warning toast (but keeps the picked colour) when saving the default fails", async () => {
    mutateMock.mockRejectedValue(new Error("network down"));
    render(<LabelsPage />);
    await screen.findByText("QR Labels");

    fireEvent.click(screen.getByRole("button", { name: "Accent" }));

    await waitFor(() => expect(showToastMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Accent" }).getAttribute("aria-pressed")).toBe("true");
  });
});

// Owner report 13 September 2026: "QR Only" was offered as a size, pixel sizes
// reached printed labels, the style cards were crushed, and the Feedback button
// covered Preview & Print.
describe("artist labels page: styles, sizes and the action bar (owner report 13 September 2026)", () => {
  beforeEach(() => _resetFeedbackBubbleVisibility());

  const styleGroup = () => screen.getByRole("group", { name: "Label style" });
  const sizeGroup = () => screen.getByRole("group", { name: "Label size" });

  it("offers QR Only as a style, and only Small to Extra Large as sizes", async () => {
    render(<LabelsPage />);
    await screen.findByText("QR Labels");
    expect(within(styleGroup()).getByRole("button", { name: /^QR Only/ })).toBeTruthy();
    expect(within(sizeGroup()).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Small",
      "Medium",
      "Large",
      "Extra Large",
    ]);
  });

  it("never passes a pixel size to the preview, and offers each work's own sizes", async () => {
    const base = artists[0];
    artistState.artist = {
      ...base,
      subscriptionPlan: "core",
      works: [
        {
          ...base.works[0],
          id: "w1",
          title: "Pixel Work",
          dimensions: "4869 × 3246 px",
          pricing: [
            { label: "A4", price: 30 },
            { label: "4869 × 3246 px", price: 40 },
            { label: "A3", price: 50 },
          ],
        },
      ],
    };
    render(<LabelsPage />);
    await screen.findByText("QR Labels");
    fireEvent.click(screen.getByText("Print →"));

    const props = labelPreviewProps.at(-1)!;
    const [work] = props.labels as Array<Record<string, unknown>>;
    expect(work.workDimensions).toBeUndefined();
    expect(work.sizeOptions).toEqual(["A4", "A3"]);
    expect(props).not.toHaveProperty("availableSizes");
  });

  it("keeps a style and size chosen in the preview once it closes", async () => {
    render(<LabelsPage />);
    await screen.findByText("QR Labels");
    openPreview();

    const props = labelPreviewProps.at(-1)!;
    act(() => {
      (props.onLabelStyleChange as (style: string) => void)("qr_only");
      (props.onLabelSizeChange as (size: string) => void)("large");
    });
    expect(within(styleGroup()).getByRole("button", { name: /^QR Only/ }).getAttribute("aria-pressed")).toBe("true");
    expect(within(sizeGroup()).getByRole("button", { name: "Large" }).getAttribute("aria-pressed")).toBe("true");
    expect(typeof props.onLabelThemeChange).toBe("function");
  });

  // Now Minimal prints ticked rows, a style changed in the preview must bring its
  // tick boxes back too, or the next preview prints rows this one had cleared.
  it("brings the tick boxes back from a style chosen in the preview, keeping the size", async () => {
    render(<LabelsPage />);
    await screen.findByText("QR Labels");
    openPreview();
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

  // Owner follow-up, 13 September 2026: Minimal needs its tick boxes too.
  it("shows the Medium, Dimensions and Price tick boxes for Minimal and Editorial, not QR Only", async () => {
    render(<LabelsPage />);
    await screen.findByText("QR Labels");
    expect(screen.getByRole("checkbox", { name: "Price" })).toBeTruthy();

    fireEvent.click(within(styleGroup()).getByRole("button", { name: /^Editorial/ }));
    expect(screen.getByRole("checkbox", { name: "Price" })).toBeTruthy();

    fireEvent.click(within(styleGroup()).getByRole("button", { name: /^QR Only/ }));
    expect(screen.queryByRole("checkbox", { name: "Price" })).toBeNull();
  });

  it("hides the Feedback button while the Preview & Print bar is on screen", async () => {
    render(<LabelsPage />);
    await screen.findByText("QR Labels");
    expect(isFeedbackBubbleHidden()).toBe(false);

    fireEvent.click(screen.getAllByText("+")[0]);
    expect(await screen.findByText("Preview & Print")).toBeTruthy();
    expect(isFeedbackBubbleHidden()).toBe(true);

    fireEvent.click(screen.getByText("Clear"));
    await waitFor(() => expect(isFeedbackBubbleHidden()).toBe(false));
  });
});
