import { describe, expect, it, vi, beforeEach } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { saveCartSession, loadCartSession } from "./cart-sessions";

beforeEach(() => fromMock.mockReset());

describe("saveCartSession()", () => {
  it("inserts a row keyed by stripe_session_id", async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    fromMock.mockReturnValue({ insert });
    await saveCartSession({
      stripeSessionId: "cs_test_1",
      cart: [{ title: "x", price: 10, quantity: 1 }],
      shipping: { country: "GB" },
      source: "direct",
      venueSlug: "",
      artistSlugs: ["alice"],
      expectedSubtotalPence: 1000,
      expectedShippingPence: 950,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_session_id: "cs_test_1",
        artist_slugs: ["alice"],
        expected_subtotal_pence: 1000,
        expected_shipping_pence: 950,
      }),
    );
  });
});

describe("loadCartSession()", () => {
  it("returns the cart row when found and not expired", async () => {
    const select = vi.fn(() => ({
      eq: () => ({
        gt: () => ({
          maybeSingle: async () => ({ data: { cart: [], shipping: { country: "GB" } } }),
        }),
      }),
    }));
    fromMock.mockReturnValue({ select });
    const session = await loadCartSession("cs_test_1");
    expect(session).toEqual({
      cart: [],
      shipping: { country: "GB" },
      source: undefined,
      venueSlug: undefined,
      artistSlugs: undefined,
      expectedSubtotalPence: undefined,
      expectedShippingPence: undefined,
    });
  });

  it("returns null when not found", async () => {
    const select = vi.fn(() => ({
      eq: () => ({
        gt: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }));
    fromMock.mockReturnValue({ select });
    const session = await loadCartSession("cs_missing");
    expect(session).toBeNull();
  });
});
