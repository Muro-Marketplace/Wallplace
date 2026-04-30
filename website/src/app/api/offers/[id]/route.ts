// /api/offers/[id]
//
// PATCH — accept / decline / withdraw an offer.
// GET — fetch a single offer (must be a party to it).

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const patchSchema = z.object({
  action: z.enum(["accept", "decline", "withdraw"]),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const db = getSupabaseAdmin();
  const { data: offer } = await db.from("purchase_offers").select("*").eq("id", id).maybeSingle();
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offer.buyer_user_id !== auth.user!.id && offer.artist_user_id !== auth.user!.id) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  return NextResponse.json({ offer });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: offer } = await db.from("purchase_offers").select("*").eq("id", id).maybeSingle();
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const me = auth.user!.id;
  const isBuyer = offer.buyer_user_id === me;
  const isArtist = offer.artist_user_id === me;
  if (!isBuyer && !isArtist) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  if (offer.status !== "pending" && offer.status !== "countered") {
    return NextResponse.json({ error: "Offer is no longer open" }, { status: 409 });
  }

  let newStatus: string;
  let notifyRecipient: string | null = null;
  let notifyTitle = "";
  let notifyKind = "";

  switch (parsed.data.action) {
    case "accept":
      // Only the artist can accept (they own the work).
      if (!isArtist) return NextResponse.json({ error: "Only the artist can accept" }, { status: 403 });
      newStatus = "accepted";
      notifyRecipient = offer.buyer_user_id;
      notifyTitle = `Offer accepted — £${(offer.amount_pence / 100).toFixed(2)}`;
      notifyKind = "offer_accepted";
      break;
    case "decline":
      if (!isArtist) return NextResponse.json({ error: "Only the artist can decline" }, { status: 403 });
      newStatus = "declined";
      notifyRecipient = offer.buyer_user_id;
      notifyTitle = `Offer declined`;
      notifyKind = "offer_declined";
      break;
    case "withdraw":
      // Only the buyer can withdraw their own offer.
      if (!isBuyer) return NextResponse.json({ error: "Only the buyer can withdraw" }, { status: 403 });
      newStatus = "withdrawn";
      notifyRecipient = offer.artist_user_id;
      notifyTitle = `Offer withdrawn`;
      notifyKind = "offer_withdrawn";
      break;
  }

  const { error } = await db.from("purchase_offers")
    .update({
      status: newStatus,
      accepted_at: newStatus === "accepted" ? new Date().toISOString() : offer.accepted_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[offers PATCH]", error);
    return NextResponse.json({ error: "Could not update offer" }, { status: 500 });
  }

  if (notifyRecipient) {
    createNotification({
      userId: notifyRecipient,
      kind: notifyKind,
      title: notifyTitle,
      body: newStatus === "accepted"
        ? "Tap to complete checkout."
        : newStatus === "declined"
          ? "Make a new offer if you'd like to revise."
          : "The buyer has withdrawn this offer.",
      link: isBuyer ? "/artist-portal/offers" : "/customer-portal/offers",
    }).catch((err) => console.warn("[offers] bell failed:", err));
  }

  return NextResponse.json({ success: true, status: newStatus });
}
