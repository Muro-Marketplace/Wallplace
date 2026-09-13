// Canonical labels for every order status surfaced to customers. Used by
// /orders/track AND OrderStatusTracker. ORDER_STEPS is the linear pipeline
// (the row of pips); cancelled/refunded/disputed are off-pipeline terminal
// states with their own badges.

export type OrderStatus =
  | "confirmed"
  | "artist_notified"
  | "awaiting_dispatch"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "disputed";

interface Step {
  key: OrderStatus;
  label: string;
}

export const ORDER_STEPS: Step[] = [
  { key: "confirmed", label: "Order placed" },
  { key: "artist_notified", label: "Artist notified" },
  { key: "awaiting_dispatch", label: "Awaiting dispatch" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const TERMINAL = new Set<OrderStatus>([
  "delivered",
  "cancelled",
  "refunded",
  "disputed",
]);

export function isTerminalStatus(s: string): boolean {
  return TERMINAL.has(s as OrderStatus);
}

export function labelForStatus(s: string): string {
  const step = ORDER_STEPS.find((x) => x.key === s);
  if (step) return step.label;
  switch (s) {
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    case "disputed":
      return "Disputed";
    default:
      return "In progress";
  }
}

// States the customer can request a refund from. Pre-dispatch is always
// fair game (the artist hasn't shipped yet). After delivery the window is
// 14 days, matching the UK Consumer Contracts Regulations 14-day cooling-
// off period for distance sales. shipped/disputed/cancelled/refunded
// don't expose a refund button — disputes and post-shipment claims go
// through the dispute flow, and cancelled/refunded already terminated.
const PRE_DISPATCH: readonly OrderStatus[] = [
  "confirmed",
  "artist_notified",
  "awaiting_dispatch",
  "processing",
];

const POST_DELIVERY_REFUND_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
// Owner decision 13 September 2026: an artist can mark an order delivered, and
// that can come before the parcel does. The statutory window runs from arrival,
// so a delivery the artist marked, rather than the buyer, allows a week for the post.
const ARTIST_MARKED_POSTAL_ALLOWANCE_MS = 7 * 24 * 60 * 60 * 1000;

export function isRefundEligible(
  order: { status: string; delivered_at?: string | null; status_history?: unknown },
  now: Date = new Date(),
): boolean {
  if ((PRE_DISPATCH as readonly string[]).includes(order.status)) return true;
  if (order.status === "delivered" && order.delivered_at) {
    const elapsed = now.getTime() - new Date(order.delivered_at).getTime();
    const windowMs =
      POST_DELIVERY_REFUND_WINDOW_MS +
      (deliveryMarkedByArtist(order.status_history) ? ARTIST_MARKED_POSTAL_ALLOWANCE_MS : 0);
    return elapsed >= 0 && elapsed < windowMs;
  }
  return false;
}

/** Whether the order's first `delivered` entry was the artist's mark. delivered_at
 *  is stamped on that first entry, so it is the one the window runs from. */
function deliveryMarkedByArtist(history: unknown): boolean {
  if (!Array.isArray(history)) return false;
  const first = history.find(
    (entry): entry is { status: string; by?: unknown } =>
      !!entry && typeof entry === "object" && (entry as { status?: unknown }).status === "delivered",
  );
  return first?.by === "seller";
}
