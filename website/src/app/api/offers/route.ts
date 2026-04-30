// /api/offers — purchase offers on works and collections.
//
// GET — list the caller's offers (as buyer or artist).
// POST — create a new offer or counter an existing one.
//
// Status flow: pending → accepted | declined | countered | expired | withdrawn
// After acceptance: → paid (Stripe webhook flips this once the buyer
// completes checkout via /api/offers/[id]/checkout).

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email/send";
import { ReviewPostedNotification } from "@/emails/templates/messages/ReviewPostedNotification";

export const runtime = "nodejs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://wallplace.co.uk";

const createSchema = z.object({
  artistSlug: z.string().min(1),
  workIds: z.array(z.string()).default([]),
  collectionId: z.string().optional(),
  amountPence: z.number().int().positive().max(50_000_000), // £500k cap, enough for any artwork
  message: z.string().max(2000).optional(),
  expiresAt: z.string().datetime().optional(),
  parentOfferId: z.string().optional(),
});

type DbWorkRow = {
  id: string;
  pricing: Array<{ label: string; price: number }> | null;
};

/**
 * Compute the "asking price" used to enforce the 60% offer floor.
 * For works: sum of the largest size price per work. For collections:
 * sum of all collection items' largest sizes.
 *
 * Returns `null` if we can't determine a price (in which case the
 * caller should let the offer through — the artist can still decline).
 */
async function computeAskingPricePence(
  db: ReturnType<typeof getSupabaseAdmin>,
  target: { workIds: string[]; collectionId?: string | null },
): Promise<number | null> {
  let workIds = target.workIds;
  if (target.collectionId) {
    const { data: collection } = await db
      .from("artist_collections")
      .select("work_ids")
      .eq("id", target.collectionId)
      .maybeSingle<{ work_ids: string[] | null }>();
    if (!collection?.work_ids?.length) return null;
    workIds = collection.work_ids;
  }
  if (workIds.length === 0) return null;

  const { data: works } = await db
    .from("artist_works")
    .select("id, pricing")
    .in("id", workIds);
  if (!works || works.length === 0) return null;

  let totalPence = 0;
  let priced = 0;
  for (const w of works as DbWorkRow[]) {
    const tiers = Array.isArray(w.pricing) ? w.pricing : [];
    if (tiers.length === 0) continue;
    const maxPrice = Math.max(...tiers.map((t) => Number(t.price) || 0));
    if (maxPrice > 0) {
      totalPence += Math.round(maxPrice * 100);
      priced++;
    }
  }
  return priced > 0 ? totalPence : null;
}

type DbOffer = {
  id: string;
  buyer_user_id: string;
  buyer_type: "customer" | "venue";
  artist_user_id: string;
  artist_slug: string | null;
  work_ids: string[];
  collection_id: string | null;
  amount_pence: number;
  currency: string;
  message: string | null;
  status: string;
  conversation_id: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  paid_order_id: string | null;
  parent_offer_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const role = url.searchParams.get("role"); // 'buyer' | 'artist' | null (both)

  const db = getSupabaseAdmin();
  const userId = auth.user!.id;

  let query = db.from("purchase_offers").select("*").order("created_at", { ascending: false });
  if (role === "buyer") {
    query = query.eq("buyer_user_id", userId);
  } else if (role === "artist") {
    query = query.eq("artist_user_id", userId);
  } else {
    query = query.or(`buyer_user_id.eq.${userId},artist_user_id.eq.${userId}`);
  }
  const { data, error } = await query.limit(200);
  if (error) {
    console.error("[offers GET]", error);
    return NextResponse.json({ error: "Could not load offers" }, { status: 500 });
  }
  return NextResponse.json({ offers: data || [] });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offer" }, { status: 400 });
  }

  const { artistSlug, workIds, collectionId, amountPence, message, expiresAt, parentOfferId } = parsed.data;

  if ((workIds.length === 0 && !collectionId) || (workIds.length > 0 && collectionId)) {
    return NextResponse.json({ error: "Provide either workIds or a collectionId" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const buyerId = auth.user!.id;

  // VENUE-ONLY GATE. Customers cannot make purchase offers; artists
  // can only respond to offers they receive (via PATCH on existing
  // rows or via artwork-request-responses).
  const { data: venueProfile } = await db
    .from("venue_profiles")
    .select("user_id, slug")
    .eq("user_id", buyerId)
    .maybeSingle();

  // Allow the artist to counter their own thread (parentOfferId set), but
  // block any non-venue, non-artist initiator.
  const isArtistCountering = !!parentOfferId;
  if (!venueProfile && !isArtistCountering) {
    return NextResponse.json(
      {
        error: "venue_only",
        message:
          "Make-an-Offer is currently available to venues only. " +
          "If you're a customer, please complete a standard purchase via the artwork page.",
      },
      { status: 403 },
    );
  }

  const buyerType: "customer" | "venue" = venueProfile ? "venue" : "customer";

  // Resolve artist by slug.
  const { data: artistProfile } = await db
    .from("artist_profiles")
    .select("user_id, name")
    .eq("slug", artistSlug)
    .maybeSingle();
  if (!artistProfile) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  // Minimum-offer check — venues can offer at most 40% below the asking
  // price. The asking price is the sum of the listed prices for the
  // works in workIds, OR for the collection (sum of items inside).
  // Counters from the artist side aren't subject to this floor — they
  // can negotiate freely on their own work.
  if (!isArtistCountering) {
    const askingPence = await computeAskingPricePence(db, { workIds, collectionId });
    if (askingPence != null) {
      const floor = Math.ceil(askingPence * 0.60);
      if (amountPence < floor) {
        return NextResponse.json(
          {
            error: "below_minimum_offer",
            message: `Offers can be up to 40% below the listed price. The minimum for this is £${(floor / 100).toFixed(2)}.`,
            minimumPence: floor,
            askingPence,
          },
          { status: 400 },
        );
      }
    }
  }

  // Counter — server-side check that the parent exists, the caller is a
  // party to it, and it's still pending.
  if (parentOfferId) {
    const { data: parent } = await db
      .from("purchase_offers")
      .select("*")
      .eq("id", parentOfferId)
      .maybeSingle();
    if (!parent || (parent.buyer_user_id !== buyerId && parent.artist_user_id !== buyerId)) {
      return NextResponse.json({ error: "Cannot counter this offer" }, { status: 403 });
    }
    if (parent.status !== "pending" && parent.status !== "countered") {
      return NextResponse.json({ error: "Offer is no longer open" }, { status: 409 });
    }
    // Mark the parent as countered. The new row becomes the live one.
    await db.from("purchase_offers")
      .update({ status: "countered", updated_at: new Date().toISOString() })
      .eq("id", parentOfferId);
  }

  const id = `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = {
    id,
    buyer_user_id: buyerId,
    buyer_type: buyerType,
    buyer_email: auth.user!.email || null,
    artist_user_id: artistProfile.user_id,
    artist_slug: artistSlug,
    work_ids: workIds,
    collection_id: collectionId || null,
    amount_pence: amountPence,
    currency: "GBP",
    message: message || null,
    status: "pending",
    expires_at: expiresAt || null,
    parent_offer_id: parentOfferId || null,
  };

  const { error } = await db.from("purchase_offers").insert(row);
  if (error) {
    console.error("[offers POST]", error);
    return NextResponse.json({ error: "Could not save offer" }, { status: 500 });
  }

  // Notify the recipient (artist on initial, buyer on counter).
  const recipientId = parentOfferId
    ? (await db.from("purchase_offers").select("buyer_user_id, artist_user_id").eq("id", parentOfferId).single()).data
    : { artist_user_id: artistProfile.user_id, buyer_user_id: buyerId };
  if (recipientId) {
    const recipient = recipientId.buyer_user_id === buyerId ? recipientId.artist_user_id : recipientId.buyer_user_id;
    if (recipient) {
      const formatted = `£${(amountPence / 100).toFixed(2)}`;
      const link = `/${parentOfferId ? "customer-portal" : artistProfile.user_id === recipient ? "artist-portal" : "customer-portal"}/offers`;
      createNotification({
        userId: recipient,
        kind: parentOfferId ? "offer_counter" : "offer_received",
        title: parentOfferId ? `Counter offer — ${formatted}` : `New offer — ${formatted}`,
        body: message ? message.slice(0, 140) : "Tap to review",
        link,
      }).catch((err) => console.warn("[offers] bell failed:", err));

      // Email — reuse the review template? No — write a new minimal
      // notification email so we don't conflate categories. For now
      // send a plain text-ish ReviewPostedNotification-shaped email
      // with a fake rating-style summary; or fall back to legacy
      // notify. Keeping this lean: just bell + email_event log via a
      // dedicated message call.
      try {
        const { data: { user: target } } = await db.auth.admin.getUserById(recipient);
        if (target?.email) {
          // Use the review template visually — it's the closest fit
          // until we ship a dedicated offer template.
          await sendEmail({
            idempotencyKey: `offer:${id}:${recipient}`,
            template: "offer_received",
            category: "placements",
            to: target.email,
            subject: parentOfferId
              ? `Counter offer of ${formatted} on Wallplace`
              : `New offer of ${formatted} on Wallplace`,
            userId: recipient,
            react: ReviewPostedNotification({
              firstName: (target.user_metadata?.display_name as string || target.email.split("@")[0]).split(" ")[0],
              reviewerName: parentOfferId ? "Buyer" : auth.user!.email?.split("@")[0] || "Buyer",
              reviewRating: 5,
              reviewText: `${formatted}${message ? `\n\n${message}` : ""}`,
              reviewUrl: `${SITE}${link}`,
            }),
            metadata: { offerId: id },
          });
        }
      } catch (err) {
        console.warn("[offers] email skipped:", err);
      }
    }
  }

  // Re-read to return the canonical row.
  const { data: created } = await db.from("purchase_offers").select("*").eq("id", id).single();
  return NextResponse.json({ success: true, offer: created as DbOffer });
}
