//
// Order lifecycle: confirmed → processing → shipped → delivered.
// Cancelled is reachable from any non-terminal state. delivered and
// cancelled are both terminal. Backward transitions and skips are
// blocked so the artist can't, say, mark an order delivered the moment
// it's paid (which would release the 14-day pending transfer early).

export const ORDER_STATUSES = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export type TransitionResult = { ok: true } | { ok: false; reason: string };

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: OrderStatus, to: OrderStatus): TransitionResult {
  if (!isOrderStatus(from)) {
    return { ok: false, reason: `Unknown current status: ${from}` };
  }
  if (!isOrderStatus(to)) {
    return { ok: false, reason: `Unknown target status: ${to}` };
  }
  if (TRANSITIONS[from].includes(to)) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: `Order is ${from}; cannot move to ${to}.`,
  };
}
