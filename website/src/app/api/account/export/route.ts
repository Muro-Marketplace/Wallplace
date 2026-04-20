import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET /api/account/export
// Authenticated user receives a JSON dump of every record we hold keyed to
// their user_id or email. Satisfies UK GDPR "right of access".
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const userId = auth.user!.id;
  const email = auth.user!.email || "";
  const db = getSupabaseAdmin();

  async function fetchAll<T>(table: string, column: string, value: string): Promise<T[]> {
    try {
      const { data } = await db.from(table).select("*").eq(column, value);
      return (data || []) as T[];
    } catch {
      return [];
    }
  }

  const [
    artistProfile,
    venueProfile,
    artistWorks,
    placementsArtist,
    placementsVenue,
    placementRecordsArtist,
    placementRecordsVenue,
    placementPhotos,
    messagesSent,
    messagesReceivedByUser,
    ordersBuyer,
    ordersArtist,
    refundRequests,
    savedItems,
    termsAcceptances,
    notifications,
    applications,
    waitlist,
    enquiries,
    collections,
  ] = await Promise.all([
    fetchAll("artist_profiles", "user_id", userId),
    fetchAll("venue_profiles", "user_id", userId),
    (async () => {
      const { data: ap } = await db.from("artist_profiles").select("id").eq("user_id", userId).maybeSingle();
      if (!ap?.id) return [];
      const { data } = await db.from("artist_works").select("*").eq("artist_id", ap.id);
      return data || [];
    })(),
    fetchAll("placements", "artist_user_id", userId),
    fetchAll("placements", "venue_user_id", userId),
    fetchAll("placement_records", "artist_user_id", userId),
    fetchAll("placement_records", "venue_user_id", userId),
    fetchAll("placement_photos", "uploader_user_id", userId),
    fetchAll("messages", "sender_id", userId),
    fetchAll("messages", "recipient_user_id", userId),
    email ? fetchAll("orders", "buyer_email", email) : Promise.resolve([]),
    fetchAll("orders", "artist_user_id", userId),
    fetchAll("refund_requests", "requester_user_id", userId),
    fetchAll("saved_items", "user_id", userId),
    fetchAll("terms_acceptances", "user_id", userId),
    fetchAll("notifications", "user_id", userId),
    email ? fetchAll("applications", "email", email) : Promise.resolve([]),
    email ? fetchAll("waitlist", "email", email) : Promise.resolve([]),
    email ? fetchAll("enquiries", "sender_email", email) : Promise.resolve([]),
    fetchAll("artist_collections", "artist_id", userId),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: userId, email },
    data: {
      artistProfile,
      venueProfile,
      artistWorks,
      placements: {
        asArtist: placementsArtist,
        asVenue: placementsVenue,
      },
      placementRecords: {
        asArtist: placementRecordsArtist,
        asVenue: placementRecordsVenue,
      },
      placementPhotos,
      messages: {
        sent: messagesSent,
        received: messagesReceivedByUser,
      },
      orders: {
        asBuyer: ordersBuyer,
        asArtist: ordersArtist,
      },
      refundRequests,
      savedItems,
      termsAcceptances,
      notifications,
      applications,
      waitlist,
      enquiries,
      collections,
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="wallplace-export-${userId}-${Date.now()}.json"`,
    },
  });
}
