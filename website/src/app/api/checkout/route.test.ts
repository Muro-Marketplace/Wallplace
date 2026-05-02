import { describe, expect, it, vi, beforeEach } from "vitest";

// vi.hoisted runs before vi.mock factories, so refs in the factories below
// are initialised when the factory is evaluated.
const { fromMock, stripeCreate } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  stripeCreate: vi.fn(async () => ({ url: "https://stripe.example/session" })),
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

vi.mock("@/lib/shipping-checkout", () => ({
  calculateOrderShipping: () => ({ totalShipping: 0, artistGroups: [] }),
}));

vi.mock("@/lib/validations", () => ({
  checkoutSchema: {
    safeParse: (b: unknown) => ({ success: true, data: b }),
  },
}));

import { POST } from "./route";

beforeEach(() => {
  fromMock.mockReset();
  stripeCreate.mockClear();
});

function req(body: unknown, auth = "Bearer artist-alice"): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const makeBody = (artistSlug: string) => ({
  items: [
    {
      title: "Untitled",
      artistSlug,
      artistName: "Alice",
      price: 100,
      quantity: 1,
      size: "S",
      image: "",
      shippingPrice: 5,
      internationalShippingPrice: 12,
      dimensions: null,
      framed: false,
    },
  ],
  shipping: {
    fullName: "Alice",
    email: "alice@x.com",
    phone: "",
    addressLine1: "1 St",
    addressLine2: "",
    city: "London",
    postcode: "E1",
    country: "United Kingdom",
    notes: "",
  },
});

describe("POST /api/checkout self-purchase guard", () => {
  it("rejects when authenticated artist's slug matches a cart item", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { slug: "alice", user_id: "u-alice" } }) }),
      }),
    }));
    const res = await POST(req(makeBody("alice")));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/own work/i);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("permits a guest checkout (no auth)", async () => {
    const res = await POST(req(makeBody("alice"), ""));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalled();
  });

  it("permits an artist buying a different artist's work", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { slug: "alice", user_id: "u-alice" } }) }),
      }),
    }));
    const res = await POST(req(makeBody("bob")));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalled();
  });
});
