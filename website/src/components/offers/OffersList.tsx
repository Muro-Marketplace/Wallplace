"use client";

// Shared offers list — used in both the venue (buyer) and artist
// (recipient) portals. Renders status, price, message, and the
// appropriate action buttons based on viewer role + offer status.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api-client";

interface OfferRow {
  id: string;
  buyer_user_id: string;
  artist_user_id: string;
  artist_slug: string | null;
  work_ids: string[];
  collection_id: string | null;
  amount_pence: number;
  currency: string;
  message: string | null;
  status: string;
  expires_at: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  paid_order_id: string | null;
  created_at: string;
  parent_offer_id: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  countered: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-foreground/5 text-foreground/40 border-border",
  withdrawn: "bg-foreground/5 text-foreground/40 border-border",
  expired: "bg-foreground/5 text-foreground/40 border-border",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-300",
};

interface Props {
  /** The viewer's user id, so we can decide which side of the offer they are. */
  viewerUserId: string;
  /** Show this side only — defaults to both. */
  filter?: "buyer" | "artist";
}

export default function OffersList({ viewerUserId, filter }: Props) {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter ? `/api/offers?role=${filter}` : "/api/offers";
      const res = await authFetch(url);
      const data = await res.json();
      setOffers(data.offers || []);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "accept" | "decline" | "withdraw") {
    setBusyId(id);
    setError(null);
    try {
      const res = await authFetch(`/api/offers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update offer.");
      } else {
        await load();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function pay(id: string) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/offers/${id}/checkout`, { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not start checkout.");
        setBusyId(null);
      }
    } catch {
      setError("Network error. Please try again.");
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (offers.length === 0) {
    return (
      <p className="text-sm text-muted">
        No offers yet.{" "}
        {filter === "buyer" && (
          <Link href="/browse" className="text-accent hover:underline">Browse artwork</Link>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {offers.map((o) => {
        const iAmBuyer = o.buyer_user_id === viewerUserId;
        const iAmArtist = o.artist_user_id === viewerUserId;
        const formatted = `£${(o.amount_pence / 100).toFixed(2)}`;
        const target = o.collection_id ? `Collection ${o.collection_id}` : `${o.work_ids.length} work${o.work_ids.length === 1 ? "" : "s"}`;

        return (
          <article key={o.id} className="bg-surface border border-border rounded-sm p-5">
            <header className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-base font-medium">{formatted}</p>
                <p className="text-xs text-muted">{target} · {iAmBuyer ? `to ${o.artist_slug || "artist"}` : "from venue"}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-sm border ${STATUS_BADGE[o.status] || STATUS_BADGE.pending}`}>
                {o.status}
              </span>
            </header>
            {o.message && <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap mb-3">{o.message}</p>}

            <footer className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {iAmArtist && (o.status === "pending" || o.status === "countered") && (
                <>
                  <button
                    type="button"
                    onClick={() => act(o.id, "accept")}
                    disabled={busyId === o.id}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-sm transition-colors disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => act(o.id, "decline")}
                    disabled={busyId === o.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-sm transition-colors disabled:opacity-60"
                  >
                    Decline
                  </button>
                </>
              )}
              {iAmBuyer && (o.status === "pending" || o.status === "countered") && (
                <button
                  type="button"
                  onClick={() => act(o.id, "withdraw")}
                  disabled={busyId === o.id}
                  className="px-3 py-1.5 text-xs font-medium text-muted bg-surface hover:bg-foreground/5 border border-border rounded-sm transition-colors disabled:opacity-60"
                >
                  Withdraw
                </button>
              )}
              {iAmBuyer && o.status === "accepted" && (
                <button
                  type="button"
                  onClick={() => pay(o.id)}
                  disabled={busyId === o.id}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent/90 rounded-sm transition-colors disabled:opacity-60"
                >
                  Complete payment — {formatted}
                </button>
              )}
              {o.status === "paid" && (
                <span className="text-xs text-emerald-700">Paid · order {o.paid_order_id}</span>
              )}
              <span className="text-[10px] text-muted ml-auto">{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
