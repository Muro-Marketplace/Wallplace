// POST /api/offers/[id]/checkout
//
// Buyer (the venue) completes payment on an accepted offer. Creates a
// Stripe Checkout Session at the agreed amount. The webhook flips the
// offer to 'paid' and threads the resulting order id back.

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

export const runtime = "nodejs";

interface OfferRow {
  id: string;
  buyer_user_id: string;
  buyer_email: string | null;
  artist_user_id: string;
  artist_slug: string | null;
  work_ids: string[];
  collection_id: string | null;
  amount_pence: number;
  currency: string;
  status: string;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const db = getSupabaseAdmin();
  const { data: offer } = await db.from("purchase_offers").select("*").eq("id", id).maybeSingle<OfferRow>();
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offer.buyer_user_id !== auth.user!.id) {
    return NextResponse.json({ error: "Only the buyer can check out" }, { status: 403 });
  }
  if (offer.status !== "accepted") {
    return NextResponse.json({ error: "Offer is not in an accepted state" }, { status: 409 });
  }

  // Build a single-line Stripe session for the agreed amount. We intentionally
  // collapse the items into one line — the offer is an aggregate price, not a
  // line-by-line invoice.
  const requestOrigin = request.headers.get("origin");
  const origin = requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || "https://wallplace.co.uk";

  const description = offer.collection_id
    ? `Accepted offer for collection ${offer.collection_id}`
    : `Accepted offer for ${offer.work_ids.length} work${offer.work_ids.length === 1 ? "" : "s"}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: offer.buyer_email || auth.user!.email || undefined,
    line_items: [
      {
        price_data: {
          currency: offer.currency.toLowerCase(),
          product_data: {
            name: `Wallplace offer · ${offer.id}`,
            description,
          },
          unit_amount: offer.amount_pence,
        },
        quantity: 1,
      },
    ],
    metadata: {
      offer_id: offer.id,
      offer_buyer_user_id: offer.buyer_user_id,
      offer_artist_user_id: offer.artist_user_id,
      offer_artist_slug: offer.artist_slug || "",
      offer_work_ids: offer.work_ids.join(","),
      offer_collection_id: offer.collection_id || "",
      offer_amount_pence: String(offer.amount_pence),
      // Flag so the Stripe webhook knows to treat this differently from a
      // standard cart checkout — no shipping line, link back to the offer row.
      checkout_kind: "purchase_offer",
    },
    success_url: `${origin}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}&offer_id=${encodeURIComponent(offer.id)}`,
    cancel_url: `${origin}/customer-portal/offers`,
  });

  return NextResponse.json({ url: session.url });
}
