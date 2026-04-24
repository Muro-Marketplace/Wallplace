// Validation schemas are the boundary between client input and the DB.
// Tests focus on the bits that matter for security: length caps, enum
// allowlists, numeric bounds, and required-vs-optional.

import { describe, expect, it } from "vitest";
import {
  applySchema,
  checkoutSchema,
  contactSchema,
  messageSchema,
  placementSchema,
  placementUpdateSchema,
  waitlistSchema,
} from "./validations";

describe("waitlistSchema", () => {
  it("accepts a valid signup", () => {
    const r = waitlistSchema.safeParse({ name: "Maya Chen", email: "maya@x.com", userType: "artist" });
    expect(r.success).toBe(true);
  });

  it("rejects bad email", () => {
    const r = waitlistSchema.safeParse({ name: "Maya", email: "not-an-email", userType: "artist" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown userType (enum guard)", () => {
    const r = waitlistSchema.safeParse({ name: "Maya", email: "a@b.com", userType: "admin" });
    expect(r.success).toBe(false);
  });

  it("rejects oversized name (100 char cap)", () => {
    const r = waitlistSchema.safeParse({ name: "A".repeat(101), email: "a@b.com", userType: "artist" });
    expect(r.success).toBe(false);
  });
});

describe("contactSchema", () => {
  it("accepts a valid message", () => {
    expect(contactSchema.safeParse({ name: "X", email: "x@y.com", type: "hello", message: "hi" }).success).toBe(true);
  });

  it("caps message at 2000 chars", () => {
    const r = contactSchema.safeParse({ name: "X", email: "x@y.com", type: "hello", message: "a".repeat(2001) });
    expect(r.success).toBe(false);
  });
});

describe("messageSchema", () => {
  const base = {
    conversationId: "dm-a__b",
    senderName: "maya-chen",
    recipientSlug: "the-curzon",
    content: "Hello",
  };

  it("accepts a minimal valid message", () => {
    expect(messageSchema.safeParse(base).success).toBe(true);
  });

  it("rejects content over 5000 chars", () => {
    const r = messageSchema.safeParse({ ...base, content: "a".repeat(5001) });
    expect(r.success).toBe(false);
  });

  it("rejects unknown senderType", () => {
    const r = messageSchema.safeParse({ ...base, senderType: "admin" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown messageType", () => {
    const r = messageSchema.safeParse({ ...base, messageType: "malicious" });
    expect(r.success).toBe(false);
  });

  it("empty content is not allowed (min length 1 after trim)", () => {
    expect(messageSchema.safeParse({ ...base, content: "" }).success).toBe(false);
    expect(messageSchema.safeParse({ ...base, content: "   " }).success).toBe(false);
  });
});

describe("placementSchema", () => {
  const base = {
    id: "p_test",
    workTitle: "Last Light",
    venueSlug: "the-curzon",
    type: "revenue_share",
    revenueSharePercent: 10,
    qrEnabled: true,
  };

  it("accepts a valid placement", () => {
    expect(placementSchema.safeParse(base).success).toBe(true);
  });

  it("rejects unknown type (only free_loan/revenue_share/purchase)", () => {
    expect(placementSchema.safeParse({ ...base, type: "gift" }).success).toBe(false);
  });

  it("revenueSharePercent must be 0–100", () => {
    expect(placementSchema.safeParse({ ...base, revenueSharePercent: -1 }).success).toBe(false);
    expect(placementSchema.safeParse({ ...base, revenueSharePercent: 101 }).success).toBe(false);
    expect(placementSchema.safeParse({ ...base, revenueSharePercent: 0 }).success).toBe(true);
    expect(placementSchema.safeParse({ ...base, revenueSharePercent: 100 }).success).toBe(true);
  });

  it("monthlyFeeGbp caps at 100000", () => {
    expect(placementSchema.safeParse({ ...base, monthlyFeeGbp: 100001 }).success).toBe(false);
  });

  it("extraWorks caps at 20 entries", () => {
    const twentyOne = Array.from({ length: 21 }, (_, i) => ({ title: `w${i}` }));
    expect(placementSchema.safeParse({ ...base, extraWorks: twentyOne }).success).toBe(false);
  });
});

describe("placementUpdateSchema", () => {
  it("counter body is optional and nested", () => {
    const r = placementUpdateSchema.safeParse({
      id: "p1",
      counter: { revenueSharePercent: 15, qrEnabled: true, arrangementType: "revenue_share" },
    });
    expect(r.success).toBe(true);
  });

  it("rejects status=invalid", () => {
    expect(placementUpdateSchema.safeParse({ id: "p1", status: "nope" }).success).toBe(false);
  });

  it("rejects stage=invalid", () => {
    expect(placementUpdateSchema.safeParse({ id: "p1", stage: "teleported" }).success).toBe(false);
  });

  it("counter.revenueSharePercent still 0–100", () => {
    expect(placementUpdateSchema.safeParse({ id: "p1", counter: { revenueSharePercent: 150 } }).success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  const validItem = {
    title: "Print",
    artistName: "Maya",
    size: "A3",
    price: 100,
    quantity: 1,
  };
  const validShipping = {
    fullName: "Oliver Grant",
    email: "oliver@x.com",
    phone: "07700900000",
    addressLine1: "42 Calvert Ave",
    city: "London",
    postcode: "E2 7JP",
    country: "United Kingdom",
  };

  it("accepts a valid cart", () => {
    expect(checkoutSchema.safeParse({ items: [validItem], shipping: validShipping }).success).toBe(true);
  });

  it("rejects empty cart", () => {
    expect(checkoutSchema.safeParse({ items: [], shipping: validShipping }).success).toBe(false);
  });

  it("rejects > 50 items in one cart", () => {
    const many = Array.from({ length: 51 }, () => ({ ...validItem }));
    expect(checkoutSchema.safeParse({ items: many, shipping: validShipping }).success).toBe(false);
  });

  it("rejects negative price", () => {
    expect(
      checkoutSchema.safeParse({ items: [{ ...validItem, price: -1 }], shipping: validShipping }).success,
    ).toBe(false);
  });

  it("rejects price over £100k / 100000", () => {
    expect(
      checkoutSchema.safeParse({ items: [{ ...validItem, price: 100001 }], shipping: validShipping }).success,
    ).toBe(false);
  });

  it("rejects quantity > 10 per line", () => {
    expect(
      checkoutSchema.safeParse({ items: [{ ...validItem, quantity: 11 }], shipping: validShipping }).success,
    ).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    expect(
      checkoutSchema.safeParse({ items: [{ ...validItem, quantity: 1.5 }], shipping: validShipping }).success,
    ).toBe(false);
  });

  it("requires shipping.email", () => {
    const { email: _, ...noEmail } = validShipping;
    void _;
    expect(checkoutSchema.safeParse({ items: [validItem], shipping: noEmail }).success).toBe(false);
  });
});

describe("applySchema", () => {
  const base = {
    name: "Maya Chen",
    email: "maya@x.com",
    location: "London",
    primaryMedium: "Photography",
  };

  it("accepts a minimal application", () => {
    expect(applySchema.safeParse(base).success).toBe(true);
  });

  it("rejects unknown discipline (enum)", () => {
    expect(applySchema.safeParse({ ...base, discipline: "not-a-discipline" }).success).toBe(false);
  });

  it("subStyles capped at 20", () => {
    const many = Array.from({ length: 21 }, (_, i) => `s${i}`);
    expect(applySchema.safeParse({ ...base, subStyles: many }).success).toBe(false);
  });

  it("rejects selectedPlan outside the enum", () => {
    expect(applySchema.safeParse({ ...base, selectedPlan: "enterprise" }).success).toBe(false);
  });
});
