"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import CustomerPortalLayout from "@/components/CustomerPortalLayout";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/api-client";

function safeArray(val: unknown): { title: string; qty: number; price: number; artistSlug?: string }[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") { try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  return [];
}

interface Order {
  id: string;
  items: { title: string; qty: number; price: number; artistSlug?: string }[];
  total: number;
  status: string;
  status_history: { status: string; timestamp: string }[];
  tracking_number?: string;
  shipping: { fullName: string; addressLine1: string; city: string; postcode: string };
  created_at: string;
  artist_slug?: string;
  venue_slug?: string;
}

export default function CustomerPortalPage() {
  const { displayName } = useAuth();
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

  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const rawSelected = orders.find((o) => o.id === selectedOrder);
  // Ensure items is always an array and status_history is parsed
  const selected = rawSelected ? {
    ...rawSelected,
    items: Array.isArray(rawSelected.items) ? rawSelected.items : (typeof rawSelected.items === "string" ? (() => { try { return JSON.parse(rawSelected.items); } catch { return []; } })() : []),
    status_history: Array.isArray(rawSelected.status_history) ? rawSelected.status_history : (typeof rawSelected.status_history === "string" ? (() => { try { return JSON.parse(rawSelected.status_history); } catch { return []; } })() : []),
    total: rawSelected.total || 0,
  } : null;

  return (
    <CustomerPortalLayout>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl">My Orders</h1>
        <p className="text-sm text-muted mt-1">Track your purchases and delivery status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-sm p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Orders</p>
          <p className="text-2xl font-serif">{orders.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-sm p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Spent</p>
          <p className="text-2xl font-serif">&pound;{totalSpent.toFixed(2)}</p>
        </div>
      </div>

      {/* Order detail overlay */}
      {selected && (
        <div className="bg-surface border border-accent/20 rounded-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-medium">Order {selected.id}</h2>
            <button onClick={() => setSelectedOrder(null)} className="text-xs text-muted hover:text-foreground">Close</button>
          </div>

          <OrderStatusTracker
            currentStatus={selected.status}
            statusHistory={selected.status_history || []}
          />

          {selected.tracking_number && (
            <p className="text-sm text-muted mt-4">Tracking: <span className="text-foreground font-medium">{selected.tracking_number}</span></p>
          )}

          <div className="mt-6 space-y-3">
            <p className="text-xs text-muted uppercase tracking-wider">Items</p>
            {safeArray(selected.items).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2">
                <span className="text-foreground">{item.title} &times; {item.qty}</span>
                <span className="text-foreground font-medium">&pound;{(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm font-medium pt-2">
              <span>Total</span>
              <span>&pound;{selected.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">Shipping to</p>
            <p className="text-sm text-foreground">{selected.shipping?.fullName}</p>
            <p className="text-sm text-muted">{selected.shipping?.addressLine1}, {selected.shipping?.city} {selected.shipping?.postcode}</p>
          </div>

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
          <p className="text-muted text-sm mb-2">No orders yet</p>
          <Link href="/browse" className="text-sm text-accent hover:text-accent-hover">Browse the marketplace</Link>
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
                  <p className="text-sm font-medium text-foreground">{order.id}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{safeArray(order.items).length} item{safeArray(order.items).length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">&pound;{order.total?.toFixed(2)}</p>
                  <OrderStatusTracker currentStatus={order.status} compact />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </CustomerPortalLayout>
  );
}
