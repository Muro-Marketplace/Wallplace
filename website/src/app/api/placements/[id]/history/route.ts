import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { nameFromSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/placements/[id]/history, chronological list of
// placement_request and placement_response messages that reference
// this placement, used by the negotiation log.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id || id.length > 100) {
    return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Only parties on the placement can read its history.
  const { data: placement } = await db
    .from("placements")
    .select("artist_user_id, venue_user_id")
    .eq("id", id)
    .single();
  if (!placement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (placement.artist_user_id !== auth.user!.id && placement.venue_user_id !== auth.user!.id) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  // Postgres JSON contains, metadata->>placementId = id. Supabase's
  // .contains() drives the query server-side without pulling every
  // placement_request/response message back.
  const { data: msgs, error } = await db
    .from("messages")
    .select("id, created_at, message_type, sender_name, sender_type, content, metadata")
    .in("message_type", ["placement_request", "placement_response"])
    .contains("metadata", { placementId: id })
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("Negotiation log fetch error:", error);
    return NextResponse.json({ entries: [] });
  }

  // Owner report 13 September 2026: the log read "From fin-coles". sender_name
  // holds the sender's SLUG, deliberately, since conversations are matched on it,
  // so each entry also carries the name the artist or venue goes by. A missing
  // profile name falls back to the slug as words, never the slug itself.
  const rows = (msgs || []) as Array<Record<string, unknown> & { sender_name?: string | null; sender_type?: string | null }>;
  const slugsOf = (type: string) => [
    ...new Set(rows.filter((m) => m.sender_type === type && m.sender_name).map((m) => m.sender_name as string)),
  ];
  const [artistNames, venueNames] = await Promise.all([
    profileNames(db, "artist_profiles", slugsOf("artist")),
    profileNames(db, "venue_profiles", slugsOf("venue")),
  ]);
  const entries = rows.map((m) => {
    const slug = m.sender_name ?? "";
    const names = m.sender_type === "venue" ? venueNames : artistNames;
    return { ...m, sender_display_name: names.get(slug) || nameFromSlug(slug) };
  });

  return NextResponse.json({ entries });
}

/** Display names by slug from one profile table. Empty for no slugs or a failed read,
 *  so a lookup problem costs the log its names, never the log itself. */
async function profileNames(
  db: ReturnType<typeof getSupabaseAdmin>,
  table: "artist_profiles" | "venue_profiles",
  slugs: string[],
): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();
  try {
    const { data } = await db.from(table).select("slug, name").in("slug", slugs);
    return new Map(
      ((data || []) as Array<{ slug: string; name: string | null }>)
        .filter((p) => p.name && p.name.trim())
        .map((p) => [p.slug, (p.name as string).trim()]),
    );
  } catch (err) {
    console.error("Negotiation log name lookup failed:", err);
    return new Map();
  }
}
