import { describe, expect, it, vi, beforeEach } from "vitest";

const { stripeCreate, canArtistAcceptOrdersMock } = vi.hoisted(() => ({
  stripeCreate: vi.fn(async () => ({ url: "https://stripe.example/session" })),
  canArtistAcceptOrdersMock: vi.fn(async () => true),
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
  canArtistAcceptOrdersMock.mockReset();
  canArtistAcceptOrdersMock.mockResolvedValue(true);
});

function req(body: unknown): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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
