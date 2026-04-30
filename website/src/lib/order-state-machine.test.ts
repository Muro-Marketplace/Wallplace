import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  canTransition,
  type OrderStatus,
} from "./order-state-machine";

describe("ORDER_STATUSES", () => {
  it("contains the canonical lifecycle", () => {
    expect(ORDER_STATUSES).toEqual([
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]);
  });
});

describe("canTransition()", () => {
  // Forward path
  it.each([
    ["confirmed", "processing"],
    ["processing", "shipped"],
    ["shipped", "delivered"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toEqual({ ok: true });
  });

  // Cancellation
  it.each([
    ["confirmed", "cancelled"],
    ["processing", "cancelled"],
    ["shipped", "cancelled"],
  ] as const)("allows %s → cancelled", (from, to) => {
    expect(canTransition(from, to)).toEqual({ ok: true });
  });

  // Terminal states
  it("blocks anything out of delivered (terminal)", () => {
    for (const to of ORDER_STATUSES) {
      const result = canTransition("delivered", to);
      expect(result.ok).toBe(false);
    }
  });

  it("blocks anything out of cancelled (terminal)", () => {
    for (const to of ORDER_STATUSES) {
      const result = canTransition("cancelled", to);
      expect(result.ok).toBe(false);
    }
  });

  // Backward / skipping
  it("blocks shipped → processing (backward)", () => {
    expect(canTransition("shipped", "processing")).toEqual({
      ok: false,
      reason: expect.stringContaining("shipped"),
    });
  });

  it("blocks confirmed → delivered (skip)", () => {
    expect(canTransition("confirmed", "delivered")).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });

  // Unknown values
  it("rejects unknown status values", () => {
    expect(canTransition("confirmed", "in_orbit" as OrderStatus)).toEqual({
      ok: false,
      reason: expect.any(String),
    });
    expect(canTransition("alien" as OrderStatus, "shipped")).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });
});
