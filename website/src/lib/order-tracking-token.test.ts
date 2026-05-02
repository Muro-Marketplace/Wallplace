import { describe, expect, it, beforeEach } from "vitest";
import { signOrderToken, verifyOrderToken } from "./order-tracking-token";

beforeEach(() => {
  process.env.ORDER_TOKEN_SECRET = "test-secret-not-for-prod";
});

describe("order-tracking-token", () => {
  it("round-trips order_id + email", async () => {
    const token = await signOrderToken({ orderId: "ord-1", email: "buyer@x.com" });
    const verified = await verifyOrderToken(token);
    expect(verified).toEqual({ orderId: "ord-1", email: "buyer@x.com" });
  });

  it("rejects a tampered token", async () => {
    const token = await signOrderToken({ orderId: "ord-1", email: "buyer@x.com" });
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifyOrderToken(tampered)).rejects.toThrow();
  });

  it("rejects expired tokens", async () => {
    const token = await signOrderToken(
      { orderId: "ord-1", email: "buyer@x.com" },
      { ttlSeconds: -1 },
    );
    await expect(verifyOrderToken(token)).rejects.toThrow(/expired/i);
  });

  it("throws when ORDER_TOKEN_SECRET is unset", async () => {
    delete process.env.ORDER_TOKEN_SECRET;
    await expect(
      signOrderToken({ orderId: "ord-1", email: "buyer@x.com" }),
    ).rejects.toThrow(/ORDER_TOKEN_SECRET/);
  });
});
