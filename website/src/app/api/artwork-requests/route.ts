// /api/artwork-requests — venue-led artwork demand.
//
// GET — list artwork requests. Public for visibility=public. The venue
//       owner sees their own regardless.
// POST — venue creates a request.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(4000),
  artworkTypes: z.array(z.string()).max(10).optional().default([]),
  styles: z.array(z.string()).max(10).optional().default([]),
  subjects: z.array(z.string()).max(10).optional().default([]),
  mediums: z.array(z.string()).max(10).optional().default([]),
  minDimensionCm: z.number().int().nonnegative().optional(),
  maxDimensionCm: z.number().int().nonnegative().optional(),
  budgetMinPence: z.number().int().nonnegative().optional(),
  budgetMaxPence: z.number().int().nonnegative().optional(),
  intent: z.array(z.enum(["purchase", "commission", "display", "loan"])).min(1).max(4),
  location: z.string().max(160).optional(),
  timescale: z.enum(["asap", "weeks", "months", "flexible"]).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    caption: z.string().max(160).optional(),
  })).max(8).optional().default([]),
  visibility: z.enum(["public", "semi_public", "private"]).default("public"),
  wallId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "1";
  const status = url.searchParams.get("status") || "open";

  const db = getSupabaseAdmin();

  if (mine) {
    const auth = await getAuthenticatedUser(request);
    if (auth.error) return auth.error;
    const { data, error } = await db
      .from("artwork_requests")
      .select("*")
      .eq("venue_user_id", auth.user!.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Could not load requests" }, { status: 500 });
    return NextResponse.json({ requests: data || [] });
  }

  // Public browse — only returns public + open requests.
  const { data, error } = await db
    .from("artwork_requests")
    .select("*")
    .eq("visibility", "public")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[artwork-requests GET]", error);
    return NextResponse.json({ error: "Could not load requests" }, { status: 500 });
  }
  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Venue-only: must have a venue profile to post artwork demand.
  const { data: venue } = await db
    .from("venue_profiles")
    .select("user_id, slug")
    .eq("user_id", auth.user!.id)
    .maybeSingle();
  if (!venue) {
    return NextResponse.json(
      { error: "venue_only", message: "Only venues can post artwork requests." },
      { status: 403 },
    );
  }

  const id = `arq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await db.from("artwork_requests").insert({
    id,
    venue_user_id: auth.user!.id,
    venue_slug: venue.slug,
    wall_id: parsed.data.wallId || null,
    title: parsed.data.title.trim(),
    description: parsed.data.description.trim(),
    artwork_types: parsed.data.artworkTypes,
    styles: parsed.data.styles,
    subjects: parsed.data.subjects,
    mediums: parsed.data.mediums,
    min_dimension_cm: parsed.data.minDimensionCm ?? null,
    max_dimension_cm: parsed.data.maxDimensionCm ?? null,
    budget_min_pence: parsed.data.budgetMinPence ?? null,
    budget_max_pence: parsed.data.budgetMaxPence ?? null,
    intent: parsed.data.intent,
    location: parsed.data.location || null,
    timescale: parsed.data.timescale || null,
    images: parsed.data.images,
    visibility: parsed.data.visibility,
  });

  if (error) {
    console.error("[artwork-requests POST]", error);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
