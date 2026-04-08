"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import type { MockOrder } from "@/lib/types";

export default function ConfirmationPage() {
  const { lastOrder: contextOrder } = useCart();
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Try context first, then localStorage fallback
    if (contextOrder) {
      setOrder(contextOrder);
    } else {
      const stored = localStorage.getItem("wallspace-last-order");
      if (stored) {
        try { setOrder(JSON.parse(stored)); } catch { /* ignore */ }
      }
    }
    setLoaded(true);
  }, [contextOrder]);

  if (!loaded) return null;

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-serif mb-3">No order found</h1>
          <p className="text-sm text-muted mb-6">It looks like you haven&apos;t placed an order yet.</p>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center px-6 py-3 bg-accent text-white text-sm font-medium rounded-sm hover:bg-accent-hover transition-colors"
          >
            Discover Art
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C17C5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="text-3xl font-serif mb-2">Order Confirmed</h1>
      <p className="text-muted mb-1">Thank you for your order.</p>
      <p className="text-sm text-muted/70 mb-8">Order #{order.id}</p>

      {/* Items */}
      <div className="bg-surface border border-border rounded-sm p-5 mb-6 text-left">
        <h2 className="text-sm font-medium mb-4">Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="w-14 h-14 relative rounded-sm overflow-hidden bg-border/20 shrink-0">
                <Image src={item.image} alt={item.title} fill className="object-cover" sizes="56px" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted">{item.artistName}{item.size ? ` · ${item.size}` : ""}</p>
              </div>
              <p className="text-sm font-medium text-accent">£{item.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-4 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span>£{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Shipping</span>
            <span>{order.shippingCost === 0 ? "Free" : `£${order.shippingCost.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between text-sm font-medium pt-1 border-t border-border">
            <span>Total</span>
            <span>£{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery details */}
      <div className="bg-surface border border-border rounded-sm p-5 mb-6 text-left">
        <h2 className="text-sm font-medium mb-3">Delivery Address</h2>
        <p className="text-sm text-muted">
          {order.shipping.fullName}<br />
          {order.shipping.addressLine1}<br />
          {order.shipping.addressLine2 && <>{order.shipping.addressLine2}<br /></>}
          {order.shipping.city}, {order.shipping.postcode}<br />
          {order.shipping.country}
        </p>
      </div>

      {/* Artist fulfilment */}
      <div className="bg-accent/5 border border-accent/20 rounded-sm p-4 mb-8 text-left flex gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C17C5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5a2 2 0 01-2 2h-1" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
        <p className="text-sm text-foreground/70">
          Your order will be packed and shipped directly by the artist. Expect delivery within 5–10 working days. You&apos;ll receive a confirmation email at <strong>{order.shipping.email}</strong>.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/browse"
          className="inline-flex items-center justify-center px-6 py-3 border border-border text-foreground text-sm font-medium rounded-sm hover:bg-background transition-colors"
        >
          Continue Browsing
        </Link>
      </div>
    </div>
  );
}
