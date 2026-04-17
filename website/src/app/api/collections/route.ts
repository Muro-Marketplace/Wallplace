import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

type CollectionPayload = {
  name?: unknown;
  description?: unknown;
  bundlePrice?: unknown;
  workIds?: unknown;
  thumbnail?: unknown;
  bannerImage?: unknown;
  available?: unknown;
};

function parseBody(body: CollectionPayload) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim() !== ""
      ? body.description.trim()
      : null;
  const bundlePriceRaw = body.bundlePrice;
  const bundlePrice =
    bundlePriceRaw === null || bundlePriceRaw === undefined || bundlePriceRaw === ""
      ? null
      : parseFloat(String(bundlePriceRaw));
  const workIds = Array.isArray(body.workIds)
    ? body.workIds.filter((x): x is string => typeof x === "string")
    : [];
  const thumbnail =
    typeof body.thumbnail === "string" && body.thumbnail.trim() !== ""
      ? body.thumbnail.trim()
      : null;
  const bannerImage =
    typeof body.bannerImage === "string" && body.bannerImage.trim() !== ""
      ? body.bannerImage.trim()
      : null;
  const available = typeof body.available === "boolean" ? body.available : true;

  return { name, description, bundlePrice, workIds, thumbnail, bannerImage, available };
}

// GET: fetch collections for the authenticated artist
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const db = getSupabaseAdmin();

    const { data: profile } = await Promise.resolve(
      db.from("artist_profiles").select("id, slug").eq("user_id", auth.user!.id).single()
    );

    if (!profile) {
      return NextResponse.json({ collections: [] });
    }

    try {
      const { data, error } = await Promise.resolve(
        db
          .from("artist_collections")
          .select("*")
          .eq("artist_id", profile.id)
          .order("created_at", { ascending: false })
      );

      if (error) {
        console.error("Collections query error (table may not exist):", error.message);
        return NextResponse.json({ collections: [] });
      }

      return NextResponse.json({ collections: data || [] });
    } catch {
      return NextResponse.json({ collections: [] });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// POST: create a new collection
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const raw = (await request.json()) as CollectionPayload;
    const { name, description, bundlePrice, workIds, thumbnail, bannerImage, available } =
      parseBody(raw);

    if (!name || workIds.length < 2) {
      return NextResponse.json(
        { error: "name and at least 2 workIds are required" },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    const { data: profile } = await Promise.resolve(
      db.from("artist_profiles").select("id, slug").eq("user_id", auth.user!.id).single()
    );

    if (!profile) {
      return NextResponse.json({ error: "Artist profile not found" }, { status: 404 });
    }

    const id = `${profile.slug}-collection-${Date.now()}`;
    const now = new Date().toISOString();

    const { error } = await Promise.resolve(
      db.from("artist_collections").upsert(
        {
          id,
          artist_id: profile.id,
          artist_slug: profile.slug,
          name,
          description,
          bundle_price: bundlePrice,
          work_ids: workIds,
          thumbnail,
          banner_image: bannerImage,
          available,
          created_at: now,
          updated_at: now,
        },
        { onConflict: "id" }
      )
    );

    if (error) {
      console.error("Collections save error:", error.message);
      return NextResponse.json(
        { error: "Failed to save collection", dbSaved: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id, dbSaved: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH: update an existing collection
export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const raw = (await request.json()) as CollectionPayload & { id?: unknown };
    const id = typeof raw.id === "string" ? raw.id : "";
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { name, description, bundlePrice, workIds, thumbnail, bannerImage, available } =
      parseBody(raw);

    if (!name || workIds.length < 2) {
      return NextResponse.json(
        { error: "name and at least 2 workIds are required" },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    const { data: profile } = await Promise.resolve(
      db.from("artist_profiles").select("id").eq("user_id", auth.user!.id).single()
    );

    if (!profile) {
      return NextResponse.json({ error: "Artist profile not found" }, { status: 404 });
    }

    const { error } = await Promise.resolve(
      db
        .from("artist_collections")
        .update({
          name,
          description,
          bundle_price: bundlePrice,
          work_ids: workIds,
          thumbnail,
          banner_image: bannerImage,
          available,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("artist_id", profile.id)
    );

    if (error) {
      console.error("Collections update error:", error.message);
      return NextResponse.json(
        { error: "Failed to update collection", dbSaved: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id, dbSaved: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE: remove a collection
export async function DELETE(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    const { data: profile } = await Promise.resolve(
      db.from("artist_profiles").select("id").eq("user_id", auth.user!.id).single()
    );

    if (!profile) {
      return NextResponse.json({ error: "Artist profile not found" }, { status: 404 });
    }

    try {
      const { error } = await Promise.resolve(
        db
          .from("artist_collections")
          .delete()
          .eq("id", id)
          .eq("artist_id", profile.id)
      );

      if (error) {
        console.error("Collections delete error (table may not exist):", error.message);
        return NextResponse.json({ success: true, dbDeleted: false });
      }

      return NextResponse.json({ success: true, dbDeleted: true });
    } catch {
      return NextResponse.json({ success: true, dbDeleted: false });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
