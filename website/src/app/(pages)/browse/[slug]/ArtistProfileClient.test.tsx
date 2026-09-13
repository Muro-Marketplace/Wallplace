// @vitest-environment jsdom
// 05 E43-h + B9/F19.
//
// E43-h: the public enquiry form set setEnquirySent(true) in its catch AND used
// authFetch (which resolves on a non-2xx), so a failed enquiry told the visitor
// it was sent. The primary send goes through mutate() (throws), the confirmation
// is shown only on success, and a failure surfaces an error toast.
//
// B9/F19: the form used to post to /api/messages for EVERYONE, which 401s
// guests and 403s customers, so the form's main audience failed after filling
// it in. Guests and customers now post to /api/enquiry (the artist replies by
// email); signed-in artists and venues keep the /api/messages path.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const { mutateMock, showToastMock, authState, searchParamsMock, saveQrContextMock } = vi.hoisted(() => ({
  saveQrContextMock: vi.fn(),
  mutateMock: vi.fn(),
  showToastMock: vi.fn(),
  authState: {
    user: null as null | { id: string; email?: string },
    displayName: "",
    userType: null as string | null,
  },
  searchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/browse/alice",
  useSearchParams: () => searchParamsMock(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {}, from: () => ({}) } }));
vi.mock("@/lib/api-client", async (orig) => {
  const actual = await orig<typeof import("@/lib/api-client")>();
  return { ...actual, mutate: mutateMock };
});
vi.mock("@/context/CartContext", () => ({ useCart: () => ({ addItem: vi.fn(), items: [] }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ showToast: showToastMock }) }));
vi.mock("@/components/SaveButton", () => ({ default: () => null }));
vi.mock("@/components/ArtworkThumb", () => ({ default: () => null }));
vi.mock("@/components/offers/MakeOfferModal", () => ({ default: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/qr-context", () => ({ saveQrContext: saveQrContextMock }));

import ArtistProfileClient from "./ArtistProfileClient";
import { ApiError } from "@/lib/api-client";
import { frameSwatchDataUri, getStandardFrame } from "@/data/frame-catalogue";

afterEach(() => cleanup());
beforeEach(() => {
  mutateMock.mockReset();
  showToastMock.mockReset();
  authState.user = null;
  authState.displayName = "";
  authState.userType = null;
  searchParamsMock.mockReset();
  searchParamsMock.mockReturnValue(new URLSearchParams());
  global.fetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))) as unknown as typeof fetch;
  // Every test starts on the profile itself: opening a work moves jsdom's URL
  // to the artwork permalink, and that would otherwise carry into the next test.
  window.history.replaceState(null, "", "/browse/alice");
});

// The enquiry form lives in the work lightbox, opened from a grid card's
// "Quick look" button. currentWork must be set for the sidebar (and its Message
// CTA) to render, so we seed one work and open it.
const WORK = {
  id: "w1",
  title: "Last Light",
  medium: "Oil",
  dimensions: "50x50cm",
  priceBand: "",
  pricing: [{ label: "Medium", price: 200 }],
  available: true,
  color: "#C17C5A",
  image: "https://cdn/a.png",
  images: [],
  description: "",
  orientation: "landscape",
  frameOptions: [],
};

function renderProfile() {
  render(
    <ArtistProfileClient
      artistName="Alice"
      artistSlug="alice"
      extendedBio=""
      themes={[]}
      works={[WORK as never]}
    />,
  );
}

function openAndFillEnquiry() {
  renderProfile();
  fireEvent.click(screen.getByTitle("Quick look")); // opens the work lightbox
  fireEvent.click(screen.getByRole("button", { name: "Message Alice" }));
  fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Bob" } });
  fireEvent.change(screen.getByPlaceholderText("Your email"), { target: { value: "bob@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Your message..."), { target: { value: "Do you ship abroad?" } });
}

describe("ArtistProfileClient enquiry (05 E43-h)", () => {
  it("does NOT confirm and shows an error when the send fails", async () => {
    mutateMock.mockRejectedValue(new ApiError(500, "message rejected", "server_error", {}));
    openAndFillEnquiry();

    fireEvent.click(screen.getByText("Send Message"));

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith("message rejected", { variant: "error" }),
    );
    // Fail-before: the catch set enquirySent(true), so "Message Sent" showed on failure.
    expect(screen.queryByText("Message Sent")).toBeNull();
  });

  it("confirms only after the enquiry actually sends", async () => {
    mutateMock.mockResolvedValue({});
    openAndFillEnquiry();

    fireEvent.click(screen.getByText("Send Message"));

    await waitFor(() => expect(screen.getByText("Message Sent")).toBeTruthy());
    expect(showToastMock).not.toHaveBeenCalled();
  });
});

describe("ArtistProfileClient enquiry routing by viewer (B9/F19)", () => {
  it("a GUEST posts to /api/enquiry, never /api/messages, and is told to expect an email reply", async () => {
    mutateMock.mockResolvedValue({});
    openAndFillEnquiry();

    fireEvent.click(screen.getByText("Send Message"));

    await waitFor(() => expect(screen.getByText("Message Sent")).toBeTruthy());
    // Fail-before: this posted to /api/messages, which 401s guests, so the
    // form's widest audience always failed after typing their message.
    expect(mutateMock).toHaveBeenCalledWith("/api/enquiry", expect.objectContaining({ method: "POST" }));
    expect(mutateMock).not.toHaveBeenCalledWith("/api/messages", expect.anything());
    const body = JSON.parse((mutateMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toMatchObject({
      senderName: "Bob",
      senderEmail: "bob@example.com",
      artistSlug: "alice",
      workTitle: "Last Light",
      message: "Do you ship abroad?",
    });
    expect(screen.getByText(/reply to you by email/)).toBeTruthy();
  });

  it("a CUSTOMER posts to /api/enquiry, never /api/messages", async () => {
    authState.user = { id: "u-cust", email: "cust@example.com" };
    authState.userType = "customer";
    authState.displayName = "Cass Customer";
    mutateMock.mockResolvedValue({});
    openAndFillEnquiry();

    fireEvent.click(screen.getByText("Send Message"));

    await waitFor(() => expect(screen.getByText("Message Sent")).toBeTruthy());
    // Fail-before: /api/messages 403s accounts without an artist or venue profile.
    expect(mutateMock).toHaveBeenCalledWith("/api/enquiry", expect.objectContaining({ method: "POST" }));
    expect(mutateMock).not.toHaveBeenCalledWith("/api/messages", expect.anything());
    expect(screen.getByText(/reply to you by email/)).toBeTruthy();
  });

  it("a VENUE keeps the signed-in /api/messages path", async () => {
    authState.user = { id: "u-venue", email: "venue@example.com" };
    authState.userType = "venue";
    authState.displayName = "The Copper Kettle";
    mutateMock.mockResolvedValue({});
    openAndFillEnquiry();

    fireEvent.click(screen.getByText("Send Message"));

    await waitFor(() => expect(screen.getByText("Message Sent")).toBeTruthy());
    expect(mutateMock).toHaveBeenCalledWith("/api/messages", expect.objectContaining({ method: "POST" }));
    // The enquiries-table copy stays best-effort via plain fetch.
    expect(global.fetch).toHaveBeenCalledWith("/api/enquiry", expect.objectContaining({ method: "POST" }));
    expect(screen.getByText(/typically respond within 48 hours/)).toBeTruthy();
  });
});

describe("ArtistProfileClient ?enquiry=1 auto-open (B12/F17/H9)", () => {
  it("opens the enquiry form straight from the URL param", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("enquiry=1"));

    renderProfile();

    // No clicks: the Message CTAs elsewhere on the site land customers and
    // guests here with ?enquiry=1 expecting the form to be open.
    expect(await screen.findByPlaceholderText("Your message...")).toBeTruthy();
  });

  // B L730. "Message the artist" on an artwork page arrives here with both
  // params: ?enquiry=1 opens the form, &work= opens the lightbox behind it so
  // the enquiry can scope itself to the piece. The lightbox then synced the URL
  // to the artwork permalink and dropped the query string, putting the address
  // bar back on the page the visitor had just left. Measured live on
  // 2026-08-31: the modal appeared at 1,659ms, the URL was rewritten at
  // 1,916ms.
  it("does not rewrite the URL to the artwork permalink while the enquiry is open", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("enquiry=1&work=w1"));
    const pushState = vi.spyOn(window.history, "pushState");

    renderProfile();
    expect(await screen.findByPlaceholderText("Your message...")).toBeTruthy();

    const targets = pushState.mock.calls.map((c) => String(c[2]));
    expect(targets.filter((t) => t.includes("/last-light"))).toEqual([]);
    pushState.mockRestore();
  });

  it("still scopes the enquiry to the work the visitor came from", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("enquiry=1&work=w1"));

    renderProfile();

    // "Re: <title>" is what makes the artwork param worth sending at all.
    expect(await screen.findByText("Re: Last Light")).toBeTruthy();
  });

  it("claims the artwork permalink once the enquiry is dismissed", async () => {
    // Without this the lightbox loses its shareable link for good.
    searchParamsMock.mockReturnValue(new URLSearchParams("work=w1"));
    const pushState = vi.spyOn(window.history, "pushState");

    renderProfile();

    await waitFor(() => {
      const targets = pushState.mock.calls.map((c) => String(c[2]));
      expect(targets.some((t) => t.includes("/last-light"))).toBe(true);
    });
    pushState.mockRestore();
  });
});

// B6: the portfolio theme picker matched `title + medium` substrings rather
// than the work's theme tags, and an empty result rendered a blank space with
// no explanation. filterWorksByTheme (portfolio-filters.ts) carries the
// matching rules; these cover the wiring and the empty state.
describe("ArtistProfileClient portfolio theme filter (B6)", () => {
  const TAGGED = {
    ...WORK,
    id: "w-tagged",
    title: "Winter Field",
    themes: ["Landscapes"],
  };
  const OTHER = {
    ...WORK,
    id: "w-other",
    title: "Colours of Autumn",
    themes: ["Abstract"],
  };

  function renderWithThemes(activeWorks: unknown[]) {
    return render(
      <ArtistProfileClient
        artistName="Alice"
        artistSlug="alice"
        extendedBio=""
        themes={["Landscapes", "Abstract"]}
        works={activeWorks as never[]}
      />,
    );
  }

  /** Grid cards carry id="work-<slugified title>"; titles also appear in the
   *  hover overlay, so query the card rather than the text. */
  function cardIds(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('[id^="work-"]')).map(
      (el) => el.id,
    );
  }

  /** The Portfolio theme <select>, identified by its "All" option. */
  function themePicker(): HTMLSelectElement {
    const combos = screen.getAllByRole("combobox") as HTMLSelectElement[];
    const match = combos.find((c) =>
      Array.from(c.options).some((o) => o.value === "All"),
    );
    if (!match) throw new Error("theme picker not found");
    return match;
  }

  it("selects on the work's theme tags, not on its title", () => {
    const { container } = renderWithThemes([TAGGED, OTHER]);
    expect(cardIds(container)).toHaveLength(2);

    fireEvent.change(themePicker(), { target: { value: "Landscapes" } });

    // "Colours of Autumn" is tagged Abstract, so it must not appear under
    // Landscapes. Pre-fix the filter never read the tags at all.
    expect(cardIds(container)).toEqual(["work-winter-field"]);
  });

  it("does not pull in a work just because the theme appears in its title", () => {
    const { container } = renderWithThemes([TAGGED, OTHER]);

    fireEvent.change(themePicker(), { target: { value: "Abstract" } });

    expect(cardIds(container)).toEqual(["work-colours-of-autumn"]);
  });

  it("explains an empty result and offers a way back", () => {
    // Untagged works fall back to the substring match, which finds nothing
    // for a theme like this one. That used to render a blank space.
    const { container } = renderWithThemes([{ ...WORK, title: "Last Light" }]);

    fireEvent.change(themePicker(), { target: { value: "Landscapes" } });

    expect(cardIds(container)).toHaveLength(0);
    expect(screen.getByText("No works under this theme.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show the whole portfolio" }));
    expect(cardIds(container)).toEqual(["work-last-light"]);
  });
});

// Owner report 13 September 2026: scanning an artwork's QR code on an iPhone
// showed "This page couldn't load". Opening a work rewrites the URL with
// history.pushState, Next re-renders the page for the new URL,
// filterWorksByTheme hands back a fresh array, and both effects that listed
// filteredWorks ran again: measured at 800 pushState calls and 800
// artwork_view posts in 3 seconds. Safari throws after 100 pushState calls in
// 30 seconds, and the Reload button worked only because it drops ?work=.
describe("ArtistProfileClient opening a work (owner report 13 September 2026)", () => {
  const works = [WORK as never];
  const profile = () => (
    <ArtistProfileClient artistName="Alice" artistSlug="alice" extendedBio="" themes={[]} works={works} />
  );
  const permalinkPushes = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.filter((c) => String(c[2]) === "/browse/alice/last-light").length;
  const artworkViews = () =>
    vi.mocked(global.fetch).mock.calls.filter((c) => c[0] === "/api/analytics/track").length;

  it("claims the permalink and records the view once from a QR link, however often the page re-renders", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("ref=qr&work=last-light&size=Medium"));
    const pushState = vi.spyOn(window.history, "pushState");
    const { rerender } = render(profile());
    await waitFor(() => expect(permalinkPushes(pushState)).toBe(1));

    // Next re-renders the page after every URL change. Each pass used to push
    // and post again, which re-rendered the page again.
    for (let i = 0; i < 5; i++) rerender(profile());

    expect(permalinkPushes(pushState)).toBe(1);
    expect(artworkViews()).toBe(1);
    pushState.mockRestore();
  });

  it("does the same for a work opened from the grid", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { rerender } = render(profile());
    fireEvent.click(screen.getByTitle("Quick look"));
    await waitFor(() => expect(permalinkPushes(pushState)).toBe(1));

    for (let i = 0; i < 5; i++) rerender(profile());

    expect(permalinkPushes(pushState)).toBe(1);
    expect(artworkViews()).toBe(1);
    pushState.mockRestore();
  });
});

// Owner request 13 September 2026: a QR code printed for a venue should show that
// venue on the artwork it opens. Opening the artwork moves the address to its
// permalink, which drops ?venue=, so the venue has to outlive the query string.
describe("ArtistProfileClient venue from a QR scan (owner request 13 September 2026)", () => {
  const works = [WORK as never];
  const profile = () => (
    <ArtistProfileClient artistName="Alice" artistSlug="alice" extendedBio="" themes={[]} works={works} />
  );
  /** The lightbox's details panel: the Message button sits in its first row. */
  const artworkDetails = () =>
    screen.getByRole("button", { name: "Message Alice" }).parentElement!.parentElement as HTMLElement;

  it("shows the venue on the artwork a venue's QR code opens, even after the address loses the query", async () => {
    saveQrContextMock.mockClear();
    searchParamsMock.mockReturnValue(
      new URLSearchParams("ref=qr&venue=the-curzon&venueName=The+Curzon&va=token&work=last-light"),
    );
    const { rerender } = render(profile());
    await waitFor(() => expect(within(artworkDetails()).getByText("Seen in The Curzon")).toBeTruthy());

    // What Next reports once the lightbox has moved the address to the permalink.
    searchParamsMock.mockReturnValue(new URLSearchParams());
    rerender(profile());

    expect(within(artworkDetails()).getByText("Seen in The Curzon")).toBeTruthy();
    expect(saveQrContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        venueSlug: "the-curzon",
        venueName: "The Curzon",
        attributionToken: "token",
        artistSlug: "alice",
        workSlug: "last-light",
      }),
    );
  });

  it("says so only on the artwork the code was printed for", async () => {
    const other = { ...WORK, id: "w2", title: "First Frost" };
    const two = [WORK as never, other as never];
    searchParamsMock.mockReturnValue(
      new URLSearchParams("ref=qr&venue=the-curzon&venueName=The+Curzon&work=last-light"),
    );
    render(<ArtistProfileClient artistName="Alice" artistSlug="alice" extendedBio="" themes={[]} works={two} />);
    await waitFor(() => expect(within(artworkDetails()).getByText("Seen in The Curzon")).toBeTruthy());

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => expect(within(artworkDetails()).getByText("First Frost")).toBeTruthy());
    expect(within(artworkDetails()).queryByText(/Seen in/)).toBeNull();
  });

  it("shows no venue on an artwork opened without a venue's QR code", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("ref=qr&work=last-light"));
    render(profile());
    await waitFor(() => expect(artworkDetails()).toBeTruthy());
    expect(screen.queryByText(/Seen in/)).toBeNull();
  });
});

// Owner report 13 September 2026: a standard frame is stored as a short reference
// ("frame:walnut") so the work can save, and the lightbox draws its swatch.
describe("ArtistProfileClient lightbox frame preview (owner report 13 September 2026)", () => {
  it("draws the swatch for a stored standard frame rather than a broken image", async () => {
    const framed = { ...WORK, frameOptions: [{ label: "Walnut", priceUplift: 20, imageUrl: "frame:walnut" }] };
    render(
      <ArtistProfileClient artistName="Alice" artistSlug="alice" extendedBio="" themes={[]} works={[framed as never]} />,
    );
    fireEvent.click(screen.getByTitle("Quick look"));

    const frameSelect = (screen.getAllByRole("combobox") as HTMLSelectElement[]).find((el) =>
      Array.from(el.options).some((o) => (o.textContent ?? "").startsWith("Walnut")),
    )!;
    fireEvent.change(frameSelect, { target: { value: "0" } });

    const preview = await screen.findByAltText("Walnut preview");
    expect(preview.getAttribute("src")).toBe(frameSwatchDataUri(getStandardFrame("walnut")!));
  });
});

// Owner request 14 September 2026: the lightbox read "1 left" for a single painting.
describe("ArtistProfileClient lightbox one-of-one wording (owner request 14 September 2026)", () => {
  it("calls a one-size work with a quantity of 1 an original, one of one", async () => {
    const original = {
      ...WORK,
      medium: "Oil on canvas",
      quantityAvailable: 1,
      pricing: [{ label: "70 × 50 cm", price: 1200 }],
    };
    render(
      <ArtistProfileClient artistName="Alice" artistSlug="alice" extendedBio="" themes={[]} works={[original as never]} />,
    );
    fireEvent.click(screen.getByTitle("Quick look"));

    expect(await screen.findByText("Original, one of one")).toBeTruthy();
    expect(screen.queryByText("1 left")).toBeNull();
  });
});
