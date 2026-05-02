import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getVenueProfileByUserId, upsertVenueProfile } from "@/lib/db/venue-profiles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET: fetch the current user's venue profile
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const profile = await getVenueProfileByUserId(auth.user!.id);
  return NextResponse.json({ profile: profile || null });
}

// PUT: update venue profile
export async function PUT(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { error } = await upsertVenueProfile(auth.user!.id, body);

    if (error) {
      console.error("Venue profile update error:", error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH: partial updates — also handles adoptIfOrphan back-fill
export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));

  // Short-circuit: back-fill user_id for orphan profiles created at
  // registration time (before the user verified their email).
  if (body.adoptIfOrphan) {
    const db = getSupabaseAdmin();
    const { data: orphan } = await db
      .from("venue_profiles")
      .select("id")
      .eq("email", auth.user!.email)
      .is("user_id", null)
      .maybeSingle();
    if (orphan) {
      await db
        .from("venue_profiles")
        .update({ user_id: auth.user!.id })
        .eq("id", orphan.id);
    }
    return NextResponse.json({ ok: true });
  }

  // General partial update (same semantics as PUT but for PATCH callers)
  try {
    const { error } = await upsertVenueProfile(auth.user!.id, body);
    if (error) {
      console.error("Venue profile patch error:", error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// POST: create initial venue profile
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { name, slug, type, location, contactName, email, phone, wallSpace } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const { error } = await upsertVenueProfile(auth.user!.id, {
      slug,
      name,
      type: type || "",
      location: location || "",
      contact_name: contactName || "",
      email: email || "",
      phone: phone || "",
      wall_space: wallSpace || "",
    });

    if (error) {
      console.error("Venue profile creation error:", error);
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
