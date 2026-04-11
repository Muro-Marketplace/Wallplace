"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import VenuePortalLayout from "@/components/VenuePortalLayout";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import { authFetch } from "@/lib/api-client";

interface Order {
  id: string;
  items: { title: string; qty: number; price: number; artistSlug?: string }[];
  shipping: { fullName: string; addressLine1: string; city: string; postcode: string };
  total: number;
  venue_revenue: number;
  venue_revenue_share_percent: number;
  artist_slug?: string;
  status: string;
  status_history: { status: string; timestamp: string }[];
  tracking_number?: string;
  source?: string;
  created_at: string;
}

export default function VenueOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/orders")
      .then((r) => r.json())
      .then((data) => { if (data.orders) setOrders(data.orders); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.venue_revenue || 0), 0);
  const selected = orders.find((o) => o.id === selectedOrder);

  return (
    <VenuePortalLayout>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl">Orders</h1>
        <p className="text-sm text-muted mt-1">Sales from your venue and your purchases</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-sm p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Orders</p>
          <p className="text-2xl font-serif">{orders.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-sm p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Revenue Earned</p>
          <p className="text-2xl font-serif text-accent">&pound;{totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Order detail */}
      {selected && (
        <div className="bg-surface border border-accent/20 rounded-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-medium">Order {selected.id}</h2>
            <button onClick={() => setSelectedOrder(null)} className="text-xs text-muted hover:text-foreground">Close</button>
          </div>

          <OrderStatusTracker currentStatus={selected.status} statusHistory={selected.status_history || []} />

          {selected.tracking_number && (
            <p className="text-sm text-muted mt-4">Tracking: <span className="text-foreground font-medium">{selected.tracking_number}</span></p>
          )}

          <div className="mt-6 space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider">Items</p>
            {(selected.items || []).map((item: { title: string; qty: number; price: number }, i: number) => (
              <div key={i} className="flex justify-between text-sm border-b border-border pb-2">
                <span>{item.title} &times; {item.qty}</span>
                <span className="font-medium">&pound;{(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {selected.venue_revenue > 0 && (
            <div className="mt-5 p-4 bg-accent/5 rounded-sm border border-accent/20 space-y-2">
              <p className="text-xs text-accent uppercase tracking-wider mb-2">Your Revenue</p>
              <div className="flex justify-between text-sm"><span>Sale total</span><span>&pound;{selected.total?.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span>Your share ({selected.venue_revenue_share_percent}%)</span><span className="font-medium text-accent">&pound;{selected.venue_revenue.toFixed(2)}</span></div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border">
            <Link href={`/contact?subject=Order ${selected.id}`} className="text-sm text-accent hover:text-accent-hover transition-colors">
              Something wrong? Contact us
            </Link>
          </div>
        </div>
      )}

      {/* Order list */}
      {loading ? (
        <p className="text-muted text-sm py-12 text-center">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="bg-surface border border-border rounded-sm px-6 py-12 text-center">
          <p className="text-muted text-sm">No orders yet. Sales from your placements will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
              className={`w-full text-left bg-surface border rounded-sm p-4 sm:p-5 transition-all hover:border-accent/30 ${selectedOrder === order.id ? "border-accent/40 shadow-sm" : "border-border"}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{order.id}</p>
                    {order.source === "qr" && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-sm font-medium">QR Sale</span>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {" · "}{(order.items || []).map((i) => i.title).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  {order.venue_revenue > 0 && <p className="text-sm font-medium text-accent">&pound;{order.venue_revenue.toFixed(2)}</p>}
                  <OrderStatusTracker currentStatus={order.status} compact />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </VenuePortalLayout>
  );
}
