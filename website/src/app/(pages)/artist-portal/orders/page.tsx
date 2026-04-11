"use client";

import { useState, useEffect } from "react";
import ArtistPortalLayout from "@/components/ArtistPortalLayout";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import { authFetch } from "@/lib/api-client";

interface Order {
  id: string;
  items: { title: string; qty: number; price: number }[];
  shipping: { fullName: string; email: string; phone: string; addressLine1: string; addressLine2?: string; city: string; postcode: string; country: string };
  total: number;
  artist_revenue: number;
  venue_revenue: number;
  platform_fee: number;
  venue_revenue_share_percent: number;
  platform_fee_percent: number;
  status: string;
  status_history: { status: string; timestamp: string }[];
  tracking_number?: string;
  venue_slug?: string;
  source?: string;
  created_at: string;
}

const statusActions: Record<string, { next: string; label: string; color: string }> = {
  confirmed: { next: "processing", label: "Mark as Processing", color: "bg-blue-600 hover:bg-blue-700" },
  processing: { next: "shipped", label: "Mark as Shipped", color: "bg-accent hover:bg-accent-hover" },
  shipped: { next: "delivered", label: "Mark as Delivered", color: "bg-green-600 hover:bg-green-700" },
};

export default function ArtistOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    authFetch("/api/orders")
      .then((r) => r.json())
      .then((data) => { if (data.orders) setOrders(data.orders); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(true);
    try {
      const body: Record<string, string> = { orderId, status: newStatus };
      if (newStatus === "shipped" && trackingInput) body.trackingNumber = trackingInput;

      const res = await authFetch("/api/orders", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) =>
          o.id === orderId ? {
            ...o,
            status: newStatus,
            tracking_number: newStatus === "shipped" && trackingInput ? trackingInput : o.tracking_number,
            status_history: [...(o.status_history || []), { status: newStatus, timestamp: new Date().toISOString() }],
          } : o
        ));
        setTrackingInput("");
      }
    } catch (err) {
      console.error("Status update failed:", err);
    }
    setUpdating(false);
  }

  const selected = orders.find((o) => o.id === selectedOrder);
  const pendingCount = orders.filter((o) => o.status === "confirmed" || o.status === "processing").length;

  return (
    <ArtistPortalLayout activePath="/artist-portal/orders">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl">Orders</h1>
          <p className="text-sm text-muted mt-1">Fulfil orders and track deliveries</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {pendingCount} need attention
          </span>
        )}
      </div>

      {/* Order detail */}
      {selected && (
        <div className="bg-surface border border-accent/20 rounded-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-medium">Order {selected.id}</h2>
            <button onClick={() => setSelectedOrder(null)} className="text-xs text-muted hover:text-foreground">Close</button>
          </div>

          <OrderStatusTracker currentStatus={selected.status} statusHistory={selected.status_history || []} />

          {/* Status action */}
          {statusActions[selected.status] && (
            <div className="mt-5 p-4 bg-[#FAF8F5] rounded-sm border border-border">
              {statusActions[selected.status].next === "shipped" && (
                <div className="mb-3">
                  <label className="block text-xs text-muted mb-1">Tracking number (optional)</label>
                  <input type="text" value={trackingInput} onChange={(e) => setTrackingInput(e.target.value)} placeholder="e.g. RM123456789GB" className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent/50" />
                </div>
              )}
              <button
                onClick={() => updateStatus(selected.id, statusActions[selected.status].next)}
                disabled={updating}
                className={`px-5 py-2 text-sm font-medium text-white rounded-sm transition-colors disabled:opacity-50 ${statusActions[selected.status].color}`}
              >
                {updating ? "Updating..." : statusActions[selected.status].label}
              </button>
            </div>
          )}

          {/* Items */}
          <div className="mt-6 space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider">Items</p>
            {(selected.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-border pb-2">
                <span>{item.title} &times; {item.qty}</span>
                <span className="font-medium">&pound;{(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Revenue breakdown */}
          <div className="mt-5 p-4 bg-background rounded-sm border border-border space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">Revenue Breakdown</p>
            <div className="flex justify-between text-sm"><span>Sale total</span><span className="font-medium">&pound;{selected.total?.toFixed(2)}</span></div>
            {selected.venue_revenue > 0 && (
              <div className="flex justify-between text-sm text-muted"><span>Venue share ({selected.venue_revenue_share_percent}%)</span><span>-&pound;{selected.venue_revenue.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between text-sm text-muted"><span>Platform fee ({selected.platform_fee_percent}%)</span><span>-&pound;{selected.platform_fee?.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-border"><span>Your revenue</span><span className="text-accent">&pound;{selected.artist_revenue?.toFixed(2)}</span></div>
          </div>

          {/* Shipping */}
          <div className="mt-5">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">Ship to</p>
            <p className="text-sm font-medium">{selected.shipping?.fullName}</p>
            <p className="text-sm text-muted">{selected.shipping?.addressLine1}{selected.shipping?.addressLine2 ? `, ${selected.shipping.addressLine2}` : ""}</p>
            <p className="text-sm text-muted">{selected.shipping?.city}, {selected.shipping?.postcode}</p>
            {selected.shipping?.phone && <p className="text-sm text-muted mt-1">Phone: {selected.shipping.phone}</p>}
          </div>
        </div>
      )}

      {/* Order list */}
      {loading ? (
        <p className="text-muted text-sm py-12 text-center">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="bg-surface border border-border rounded-sm px-6 py-12 text-center">
          <p className="text-muted text-sm">No orders yet. When someone buys your work, orders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
              className={`w-full text-left bg-surface border rounded-sm p-4 sm:p-5 transition-all hover:border-accent/30 ${
                selectedOrder === order.id ? "border-accent/40 shadow-sm" : order.status === "confirmed" ? "border-amber-200" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{order.id}</p>
                    {order.source === "qr" && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-sm font-medium">QR</span>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {" · "}{(order.items || []).map((i) => i.title).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">&pound;{order.artist_revenue?.toFixed(2) || order.total?.toFixed(2)}</p>
                  <OrderStatusTracker currentStatus={order.status} compact />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </ArtistPortalLayout>
  );
}
