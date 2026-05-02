import { describe, expect, it, vi, beforeEach } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => null),
}));

import { POST } from "./route";
import { signOrderToken } from "@/lib/order-tracking-token";

beforeEach(() => {
  fromMock.mockReset();
  process.env.ORDER_TOKEN_SECRET = "test-secret";
});

function req(body: unknown): Request {
  return new Request("http://localhost/api/orders/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockOrderRow(buyerEmail: string) {
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: {
            id: "ord-1",
            status: "confirmed",
            buyer_email: buyerEmail,
            buyer_name: "Test Buyer",
            artist_slug: "alice",
            total_amount: 100,
            shipping_amount: 5,
            currency: "gbp",
            cart_items: [],
            status_history: [],
            tracking_number: null,
            tracking_url: null,
            shipped_at: null,
            delivered_at: null,
            created_at: "2026-05-01T00:00:00Z",
          },
          error: null,
        }),
      }),
    }),
  });
}

describe("POST /api/orders/track", () => {
  it("accepts a signed token and returns the order", async () => {
    mockOrderRow("buyer@x.com");
    const token = await signOrderToken({ orderId: "ord-1", email: "buyer@x.com" });
    const res = await POST(req({ token }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order?.id).toBe("ord-1");
  });

  it("rejects a tampered token with 401", async () => {
    const token = await signOrderToken({ orderId: "ord-1", email: "buyer@x.com" });
    const res = await POST(req({ token: token.slice(0, -2) + "xx" }));
    expect(res.status).toBe(401);
  });

  it("still accepts the legacy orderId + email path", async () => {
    mockOrderRow("buyer@x.com");
    const res = await POST(req({ orderId: "ord-1", email: "buyer@x.com" }));
    expect(res.status).toBe(200);
  });

  it("rejects email/orderId mismatch with 404", async () => {
    mockOrderRow("buyer@x.com");
    const res = await POST(req({ orderId: "ord-1", email: "wrong@x.com" }));
    expect(res.status).toBe(404);
  });

  it("rejects when neither token nor orderId+email supplied", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });
});
