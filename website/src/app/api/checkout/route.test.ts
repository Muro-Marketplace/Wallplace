import { describe, expect, it, vi, beforeEach } from "vitest";

// vi.hoisted runs before vi.mock factories so refs in the factories
// below are initialised when the factory is evaluated.
const { stripeCreate, fromMock, canArtistAcceptOrdersMock } = vi.hoisted(() => ({
  stripeCreate: vi.fn(async () => ({ url: "https://stripe.example/session" })),
  fromMock: vi.fn(),
  canArtistAcceptOrdersMock: vi.fn(async () => true),
}));

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: vi.fn(async (req: Request) => {
    if (req.headers.get("authorization") === "Bearer artist-alice") {
      return { user: { id: "u-alice", email: "alice@x.com" }, error: null };
    }
    return { user: null, error: null };
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: stripeCreate } } },
}));

vi.mock("@/lib/stripe-connect-status", () => ({
  canArtistAcceptOrders: canArtistAcceptOrdersMock,
}));

vi.mock("@/lib/shipping-checkout", () => ({
  calculateOrderShipping: () => ({ totalShipping: 0, artistGroups: [] }),
}));

vi.mock("@/lib/validations", () => ({
  checkoutSchema: {
    safeParse: (b: unknown) => ({ success: true, data: b }),
  },
}));

vi.mock("@/lib/cart-sessions", () => ({
  saveCartSession: vi.fn(async () => undefined),
}));

import { POST } from "./route";

beforeEach(() => {
  stripeCreate.mockClear();
  fromMock.mockReset();
  canArtistAcceptOrdersMock.mockReset();
  canArtistAcceptOrdersMock.mockResolvedValue(true);
});

function req(body: unknown, auth: string | null = null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/checkout", { method: "POST", headers, body: JSON.stringify(body) });
}

const baseShipping = {
  fullName: "Buyer",
  email: "buyer@x.com",
  phone: "",
  addressLine1: "1 St",
  addressLine2: "",
  city: "London",
  postcode: "E1",
  notes: "",
};

const baseItem = {
  title: "Untitled",
  artistSlug: "alice",
  artistName: "Alice",
  price: 100,
  quantity: 1,
  size: "S",
  image: "",
  shippingPrice: 5,
  internationalShippingPrice: 12,
  dimensions: null,
  framed: false,
};

// Plan A Task 11 — self-purchase guard (Bearer auth + cart slug match → 403).
describe("POST /api/checkout self-purchase guard", () => {
  it("rejects when authenticated artist's slug matches a cart item", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { slug: "alice", user_id: "u-alice" } }) }),
      }),
    }));
    const res = await POST(req({
      items: [baseItem],
      shipping: { ...baseShipping, country: "GB" },
    }, "Bearer artist-alice"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/own work/i);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("permits a guest checkout (no auth)", async () => {
    const res = await POST(req({
      items: [baseItem],
      shipping: { ...baseShipping, country: "GB" },
    }));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalled();
  });

  it("permits an artist buying a different artist's work", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { slug: "alice", user_id: "u-alice" } }) }),
      }),
    }));
    const res = await POST(req({
      items: [{ ...baseItem, artistSlug: "bob" }],
      shipping: { ...baseShipping, country: "GB" },
    }, "Bearer artist-alice"));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalled();
  });
});

// Plan B Task 3 — ISO country guard.
describe("POST /api/checkout country guard", () => {
  it("rejects an unsupported country with 400", async () => {
    const res = await POST(req({
      items: [baseItem],
      shipping: { ...baseShipping, country: "ZZ" },
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/ZZ/);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("accepts GB and creates a Stripe session with slim metadata", async () => {
    const res = await POST(req({
      items: [baseItem],
      shipping: { ...baseShipping, country: "GB" },
    }));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalledTimes(1);
    const calls = stripeCreate.mock.calls as unknown as Array<
      [{ metadata?: { kind?: string; shipping_country?: string } }]
    >;
    const args = calls[0]?.[0];
    // Plan B Task 6: full shipping/cart no longer in Stripe metadata.
    expect(args?.metadata?.kind).toBe("cart_checkout");
    expect(args?.metadata?.shipping_country).toBeUndefined();
  });

  it("accepts US (international) and creates a Stripe session", async () => {
    const res = await POST(req({
      items: [baseItem],
      shipping: { ...baseShipping, country: "US" },
    }));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects 'United Kingdom' (the legacy free-text value) with 400", async () => {
    const res = await POST(req({
      items: [baseItem],
      shipping: { ...baseShipping, country: "United Kingdom" },
    }));
    expect(res.status).toBe(400);
  });
});

// Plan B Task 8 — Stripe Connect pre-flight.
describe("POST /api/checkout Stripe Connect pre-flight", () => {
  it("rejects with 422 when an artist isn't charges_enabled", async () => {
    canArtistAcceptOrdersMock.mockResolvedValue(false);
    const res = await POST(req({
      items: [baseItem],
      shipping: { ...baseShipping, country: "GB" },
    }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/alice/i);
    expect(body.blocked).toEqual(["alice"]);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("permits checkout when all artists are ready", async () => {
    canArtistAcceptOrdersMock.mockResolvedValue(true);
    const res = await POST(req({
      items: [baseItem],
      shipping: { ...baseShipping, country: "GB" },
    }));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalled();
  });
});
