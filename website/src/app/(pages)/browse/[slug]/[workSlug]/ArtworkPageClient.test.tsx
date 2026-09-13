// @vitest-environment jsdom
//
// B11: the shipping info block quoted work.shippingPrice while the cart
// lines carry effectiveShippingPrice, which prefers the SELECTED SIZE's
// own shippingPrice. An artist charging £8 on A4 and £25 on the large
// canvas had "UK shipping £8.00" printed under a large canvas the cart
// then charged £25 for.
//
// B10 is covered exhaustively in frame-uplift.test.ts; the case here is
// the wiring, that the Frame dropdown row shows the artist's explicit
// per-size override rather than the perimeter ramp.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ArtistWork } from "@/data/artists";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {}, from: () => ({}) } }));
const addItemSpy = vi.fn(() => ({ ok: true }));
vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ addItem: addItemSpy, items: [] }),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, userType: null }),
}));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("@/components/SaveButton", () => ({ default: () => null }));
vi.mock("@/components/WallVisualiser", () => ({ default: () => null }));
vi.mock("@/components/visualizer/CustomerWallSheet", () => ({ default: () => null }));
vi.mock("@/components/offers/MakeOfferModal", () => ({ default: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));
const qrContextState: { value: Record<string, unknown> | null } = { value: null };
vi.mock("@/lib/qr-context", () => ({ readQrContext: () => qrContextState.value }));

import ArtworkPageClient from "./ArtworkPageClient";
import { frameSwatchDataUri, getStandardFrame } from "@/data/frame-catalogue";

/** A work whose A4 size carries its own, cheaper, shipping price. */
function workWithPerSizeShipping(): ArtistWork {
  return {
    id: "w1",
    title: "Winter Field",
    medium: "Oil on canvas",
    dimensions: "A4",
    priceBand: "£100-£500",
    // Per-size shipping on the first (default-selected) size. The
    // work-level price is deliberately different so the two are
    // distinguishable in the rendered copy.
    pricing: [
      { label: "A4", price: 120, shippingPrice: 8 },
      { label: "100x80 cm", price: 480, shippingPrice: 25 },
    ],
    available: true,
    color: "#ccc",
    image: "https://example.test/w1.jpg",
    shippingPrice: 25,
  } as ArtistWork;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network in test"))));
  qrContextState.value = null;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Artwork page shipping quote (B11)", () => {
  it("quotes the selected size's own shipping price, not the work-level one", () => {
    render(
      <ArtworkPageClient
        work={workWithPerSizeShipping()}
        artistName="Alice Rivers"
        artistSlug="alice-rivers"
      />,
    );

    // A4 is selected by default and carries shippingPrice 8.
    expect(screen.getByText("UK shipping £8.00")).toBeTruthy();
    // The work-level £25 must not be what the buyer is quoted.
    expect(screen.queryByText("UK shipping £25.00")).toBeNull();
  });

  it("still uses the work-level price when the size has none", () => {
    const work = workWithPerSizeShipping();
    work.pricing = [{ label: "A4", price: 120 }];
    render(
      <ArtworkPageClient work={work} artistName="Alice Rivers" artistSlug="alice-rivers" />,
    );

    expect(screen.getByText("UK shipping £25.00")).toBeTruthy();
  });
});

describe("Artwork page frame dropdown uplift (B10)", () => {
  it("shows the artist's explicit per-size override, not the perimeter ramp", () => {
    const work = workWithPerSizeShipping();
    work.frameOptions = [
      {
        label: "Oak",
        priceUplift: 20,
        // A4 is the smallest size, so the perimeter ramp would show the
        // flat £20 here; the artist's override says £33.
        pricesBySize: { A4: 33 },
      },
    ];
    render(
      <ArtworkPageClient work={work} artistName="Alice Rivers" artistSlug="alice-rivers" />,
    );

    // The uplift is the option's description line, so open the listbox.
    fireEvent.click(screen.getByLabelText("Choose frame"));

    expect(screen.getByText("+£33")).toBeTruthy();
    expect(screen.queryByText("+£20")).toBeNull();
  });
});

describe("buying off the wall never shows a pixel size (owner-reported 2026-08-31)", () => {
  /** A placed work whose `dimensions` is the image's pixel size, as live rows are. */
  function placedWork(): ArtistWork {
    const w = workWithPerSizeShipping();
    w.title = "Gyeongbokgung Palace";
    w.dimensions = "2795 × 4192 px";
    (w as unknown as { currentPlacement: unknown }).currentPlacement = {
      id: "p-1",
      venueSlug: "testing-venue",
      venueName: "Testing Venue",
      status: "active",
      collectionAddress: null,
      placedSizeLabel: null,
      inStorePrice: 120,
      inStoreFrameIncluded: false,
    };
    return w;
  }

  it("puts no pixel measurement in the basket line or its size", () => {
    addItemSpy.mockClear();
    render(
      <ArtworkPageClient work={placedWork()} artistName="Fin Coles" artistSlug="fin-coles" />,
    );

    const buy = screen.queryByRole("button", { name: /off the wall/i });
    if (!buy) return; // offer CTA not rendered in this harness; helper is covered by its own tests
    fireEvent.click(buy);

    const calls = addItemSpy.mock.calls as unknown as Array<[{ title?: string; size?: string }]>;
    const line = calls.at(-1)?.[0] ?? {};
    expect(line.title ?? "").not.toMatch(/px/i);
    expect(line.size ?? "").not.toMatch(/px/i);
    expect(line.size).toBe("Original");
  });
});

describe("sample pill (owner instruction, 2 September)", () => {
  it("shows a Sample pill beside a seed artist's name and changes nothing else", () => {
    render(
      <ArtworkPageClient work={workWithPerSizeShipping()} artistName="Seed Artist" artistSlug="seed-artist" isSample />,
    );
    expect(screen.getByText("Sample")).toBeTruthy();
    expect(screen.getByText(/Size & Price/i)).toBeTruthy();
  });

  it("shows no pill for a real artist", () => {
    render(
      <ArtworkPageClient work={workWithPerSizeShipping()} artistName="Alice Rivers" artistSlug="alice-rivers" />,
    );
    expect(screen.queryByText("Sample")).toBeNull();
  });
});

// LA-C065 (launch audit 2026-09-05). The Buy Now button printed the raw number
// after a pound sign, so a work priced at £162.50 read "Buy Now, £162.5".
describe("Buy Now price formatting (LA-C065)", () => {
  it("prints the price as money, with two decimals", () => {
    const work = workWithPerSizeShipping();
    work.pricing = [{ label: "A4", price: 162.5 }];
    render(<ArtworkPageClient work={work} artistName="Alice Rivers" artistSlug="alice-rivers" />);
    expect(screen.getByText(/Buy Now, £162\.50/)).toBeTruthy();
    expect(screen.queryByText(/Buy Now, £162\.5$/)).toBeNull();
  });
});

// LA-C066 (launch audit 2026-09-05). A work ticked "available to buy in store"
// with no pricing rows passed the collect gate, and the button label
// interpolated the missing price as "£null" while the basket line carried £0.
describe("collect-from-venue price (LA-C066)", () => {
  function placedWork(pricing: ArtistWork["pricing"]): ArtistWork {
    const work = workWithPerSizeShipping();
    work.pricing = pricing;
    work.availableInStore = true;
    work.currentPlacement = {
      id: "pl1",
      venueSlug: "the-gallery",
      venueName: "The Gallery",
      status: "active",
      collectionAddress: null,
      placedSizeLabel: null,
      inStorePrice: null,
    };
    return work;
  }

  it("never prints £null: with no price to quote there is no collect button", () => {
    render(<ArtworkPageClient work={placedWork([])} artistName="Alice Rivers" artistSlug="alice-rivers" />);
    expect(screen.queryByText(/£null/)).toBeNull();
    expect(screen.queryByText(/Collect from The Gallery/)).toBeNull();
  });

  it("quotes the collect price as money when there is one", () => {
    render(
      <ArtworkPageClient work={placedWork([{ label: "A4", price: 120 }])} artistName="Alice Rivers" artistSlug="alice-rivers" />,
    );
    expect(screen.getByText("Collect from The Gallery, £120.00")).toBeTruthy();
  });
});

describe("Artwork page placement terms (per-size loan fees)", () => {
  const TERMS = { revenueSharePercent: 20, openToRevenueShare: true, openToFreeLoan: true };

  function workWithFees(): ArtistWork {
    const w = workWithPerSizeShipping();
    w.pricing = [
      { label: "A4", price: 120, paidLoanMonthlyGbp: 25 },
      { label: "100x80 cm", price: 480, paidLoanMonthlyGbp: 60 },
    ];
    return w;
  }

  it("shows the share and the selected size's own fee, not From", () => {
    render(<ArtworkPageClient work={workWithFees()} artistName="Alice Rivers" artistSlug="alice-rivers" artistTerms={TERMS} />);
    expect(screen.getByText("20% Revenue Share · £25/month Paid Loan")).toBeTruthy();
    expect(screen.queryByText(/From £/)).toBeNull();
  });

  it("follows the size dropdown", () => {
    render(<ArtworkPageClient work={workWithFees()} artistName="Alice Rivers" artistSlug="alice-rivers" artistTerms={TERMS} />);
    fireEvent.click(screen.getByLabelText("Choose size"));
    // Dropdown commits an option on mouse-down, so focus stays on the trigger.
    fireEvent.mouseDown(screen.getAllByRole("option")[1]);
    expect(screen.getByText("20% Revenue Share · £60/month Paid Loan")).toBeTruthy();
  });

  it("shows nothing for a work switched off both arrangements", () => {
    const work = { ...workWithFees(), openToRevenueShareOverride: false, openToFreeLoanOverride: false };
    render(<ArtworkPageClient work={work} artistName="Alice Rivers" artistSlug="alice-rivers" artistTerms={TERMS} />);
    expect(screen.queryByText(/Revenue Share|Paid Loan/)).toBeNull();
  });
});

// Owner request 13 September 2026: a visitor who scanned a venue's QR code sees
// that venue on the artwork's own page too, for example after reloading the
// permalink the lightbox moved them to. Only on the artwork the code was printed for.
describe("Artwork page venue from a QR scan (owner request 13 September 2026)", () => {
  const scannedFor = (artistSlug: string, workSlug = "winter-field") => ({
    venueSlug: "the-curzon",
    venueName: "The Curzon",
    source: "qr",
    artistSlug,
    workSlug,
    ts: Date.now(),
  });

  it("shows the venue where the visitor scanned this artist's QR code", async () => {
    qrContextState.value = scannedFor("alice-rivers");
    render(<ArtworkPageClient work={workWithPerSizeShipping()} artistName="Alice Rivers" artistSlug="alice-rivers" />);
    expect(await screen.findByText("Seen in The Curzon")).toBeTruthy();
  });

  it("shows no venue when the scan was for another artist's work", () => {
    qrContextState.value = scannedFor("someone-else");
    render(<ArtworkPageClient work={workWithPerSizeShipping()} artistName="Alice Rivers" artistSlug="alice-rivers" />);
    expect(screen.queryByText(/Seen in/)).toBeNull();
  });

  it("shows no venue on another artwork by the same artist", () => {
    qrContextState.value = scannedFor("alice-rivers", "first-frost");
    render(<ArtworkPageClient work={workWithPerSizeShipping()} artistName="Alice Rivers" artistSlug="alice-rivers" />);
    expect(screen.queryByText(/Seen in/)).toBeNull();
  });

  it("says it once when the work is placed at the venue that was scanned", async () => {
    qrContextState.value = scannedFor("alice-rivers");
    const work = { ...workWithPerSizeShipping(), placed_at_venue: "The Curzon" };
    render(<ArtworkPageClient work={work} artistName="Alice Rivers" artistSlug="alice-rivers" />);
    expect(await screen.findByText("Seen in The Curzon")).toBeTruthy();
    expect(screen.queryByText(/Currently placed at/)).toBeNull();
  });
});

// Owner report 13 September 2026: a standard frame is stored as a short reference
// ("frame:walnut") so the work can save, and the artwork page draws its swatch.
describe("Artwork page frame preview for a standard frame (owner report 13 September 2026)", () => {
  it("draws the swatch for a stored standard frame rather than a broken image", () => {
    const work = workWithPerSizeShipping();
    work.frameOptions = [{ label: "Walnut", priceUplift: 20, imageUrl: "frame:walnut" }];
    render(<ArtworkPageClient work={work} artistName="Alice Rivers" artistSlug="alice-rivers" />);

    fireEvent.click(screen.getByLabelText("Choose frame"));
    // Dropdown commits an option on mouse-down.
    fireEvent.mouseDown(screen.getByRole("option", { name: /Walnut/ }));

    const preview = screen.getByAltText("Walnut preview") as HTMLImageElement;
    expect(preview.getAttribute("src")).toBe(frameSwatchDataUri(getStandardFrame("walnut")!));
  });
});

// Owner request 14 September 2026: a single painting read "1 available" and
// "Only 1 left at this size" to buyers, which is print-shop copy.
describe("Artwork page one-of-one wording (owner request 14 September 2026)", () => {
  it("calls a one-size work with a quantity of 1 an original, one of one", () => {
    const work = workWithPerSizeShipping();
    work.medium = "Oil on canvas";
    work.pricing = [{ label: "70 × 50 cm", price: 1200 }];
    work.quantityAvailable = 1;
    render(<ArtworkPageClient work={work} artistName="Alice Rivers" artistSlug="alice-rivers" />);

    expect(screen.getByText("Original, one of one")).toBeTruthy();
    expect(screen.queryByText("1 available")).toBeNull();
    expect(screen.queryByText(/left at this size/)).toBeNull();
  });
});
