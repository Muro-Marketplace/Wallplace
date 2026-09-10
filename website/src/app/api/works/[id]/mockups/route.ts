/**
 * /api/works/[id]/mockups
 *
 * POST  promote a previously-rendered wall preview onto an artist's work
 *       so it appears as an additional image on the artwork listing.
 *
 * Auth: artist must own both the work and the render. The endpoint is
 * 401 unauthenticated, 403 if either owner check fails, 404 if either
 * row is missing.
 *
 * Wire flow:
 *   1. Render produced via /api/walls/render-quick or
 *      /api/walls/[id]/layouts/[lid]/render (already persisted with
 *      kind in {standard,hd}).
 *   2. Editor surfaces the latest render.id to the artist.
 *   3. Artist clicks "Save to artwork" → POST { render_id } here.
 *   4. We COPY the render out of the private `wall-renders` bucket into
 *      the public `artworks` bucket, append an `ArtistWorkMockup` to
 *      artist_works.mockups (JSONB) pointing at the copy, and flip
 *      wall_renders.kept = true so the GC keeps the original around.
 *
 * Why copy rather than link (migration 140): `wall-renders` is private,
 * because a render is a composite of the venue's own wall photograph and
 * publishing it by default republished that photograph. Promoting a render
 * to a mockup is the one moment an artist deliberately chooses to publish
 * one, so that is where the object becomes public, and it becomes public by
 * being copied to the bucket the rest of the listing already uses. A signed
 * URL would be wrong here: the listing is public and permanent, and a signed
 * link expires.
 *
 * Idempotency: re-posting the same render_id is a no-op (we de-dup by
 * render_id inside the JSONB array).
 */

import { NextResponse } from "next/server";
import { isFlagOn } from "@/lib/feature-flags";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { RENDERS_BUCKET } from "@/lib/visualizer/renders-db";
import { saveMockupSchema } from "@/lib/visualizer/validations";
import type { ArtistWorkMockup } from "@/lib/visualizer/types";

export const dynamic = "force-dynamic";

/**
 * Where a promoted render lands. The same public bucket the listing's other
 * images use, so nothing downstream has to know a mockup is special.
 */
const MOCKUP_BUCKET = "artworks";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isFlagOn("WALL_VISUALIZER_V1")) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }

  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user!.id;

  const { id: workId } = await context.params;
  if (!workId) {
    return NextResponse.json({ error: "Missing work id" }, { status: 400 });
  }

  // Validate body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = saveMockupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const renderId = parsed.data.render_id;

  const db = getSupabaseAdmin();

  // Resolve the artist profile row from the user. We can't trust the
  // browser to send a profile id, and works.artist_id references
  // artist_profiles.id (not auth.users.id).
  const { data: profileRow, error: profileErr } = await db
    .from("artist_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileErr) {
    console.error("[mockups] profile lookup failed:", profileErr.message);
    return NextResponse.json(
      { error: "Could not resolve artist profile" },
      { status: 500 },
    );
  }
  if (!profileRow) {
    return NextResponse.json(
      { error: "Artist profile not found" },
      { status: 403 },
    );
  }
  const artistId = (profileRow as { id: string }).id;

  // Verify the work exists + the artist owns it.
  const { data: workRow, error: workErr } = await db
    .from("artist_works")
    .select("id, artist_id, mockups")
    .eq("id", workId)
    .maybeSingle();
  if (workErr) {
    console.error("[mockups] work lookup failed:", workErr.message);
    return NextResponse.json(
      { error: "Could not load work" },
      { status: 500 },
    );
  }
  if (!workRow) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }
  if ((workRow as { artist_id: string }).artist_id !== artistId) {
    return NextResponse.json(
      { error: "You don't own this work" },
      { status: 403 },
    );
  }

  // Verify the render exists + the user owns it.
  const { data: renderRow, error: renderErr } = await db
    .from("wall_renders")
    .select("id, user_id, layout_id, output_path")
    .eq("id", renderId)
    .maybeSingle();
  if (renderErr) {
    console.error("[mockups] render lookup failed:", renderErr.message);
    return NextResponse.json(
      { error: "Could not load render" },
      { status: 500 },
    );
  }
  if (!renderRow) {
    return NextResponse.json({ error: "Render not found" }, { status: 404 });
  }
  if ((renderRow as { user_id: string }).user_id !== userId) {
    return NextResponse.json(
      { error: "You don't own this render" },
      { status: 403 },
    );
  }

  // If the render is linked to a saved layout, fetch the wall name so
  // the mockup card has a human-friendly subtitle without needing
  // another fetch on display.
  let wallName: string | null = null;
  const layoutId = (renderRow as { layout_id: string | null }).layout_id;
  if (layoutId) {
    const { data: layoutRow } = await db
      .from("wall_layouts")
      .select("wall_id")
      .eq("id", layoutId)
      .maybeSingle();
    if (layoutRow) {
      const { data: wallRow } = await db
        .from("walls")
        .select("name")
        .eq("id", (layoutRow as { wall_id: string }).wall_id)
        .maybeSingle();
      if (wallRow) wallName = (wallRow as { name: string }).name ?? null;
    }
  }

  // Build the mockup record + de-dupe by render_id.
  const existing = Array.isArray((workRow as { mockups?: unknown }).mockups)
    ? ((workRow as { mockups: ArtistWorkMockup[] }).mockups ?? [])
    : [];
  if (existing.some((m) => m.render_id === renderId)) {
    return NextResponse.json(
      { mockup: existing.find((m) => m.render_id === renderId), deduped: true },
      { status: 200 },
    );
  }

  // Copy the render into the public bucket. This is the publish step: the
  // artist asked for this image to appear on a public listing, so it stops
  // being a private render at exactly this point and not before.
  const sourcePath = (renderRow as { output_path: string }).output_path;
  const extension = sourcePath.split(".").pop() || "webp";
  const publicPath = `${userId}/mockup-${renderId}.${extension}`;

  const { data: sourceBlob, error: downloadErr } = await db.storage
    .from(RENDERS_BUCKET)
    .download(sourcePath);
  if (downloadErr || !sourceBlob) {
    console.error("[mockups] could not read the render:", downloadErr?.message);
    return NextResponse.json(
      { error: "Could not read that render. Try rendering it again." },
      { status: 500 },
    );
  }

  const { error: copyErr } = await db.storage
    .from(MOCKUP_BUCKET)
    .upload(publicPath, sourceBlob, {
      contentType: sourceBlob.type || "image/webp",
      cacheControl: "86400",
      upsert: true,
    });
  if (copyErr) {
    console.error("[mockups] could not publish the render:", copyErr.message);
    return NextResponse.json(
      { error: "Could not save that mockup to your artwork. Please try again." },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = db.storage.from(MOCKUP_BUCKET).getPublicUrl(publicPath);

  const newMockup: ArtistWorkMockup = {
    render_id: renderId,
    url: publicUrlData.publicUrl,
    layout_id: layoutId,
    wall_name: wallName,
    created_at: new Date().toISOString(),
  };

  const next = [...existing, newMockup];
  const { error: updateErr } = await db
    .from("artist_works")
    .update({ mockups: next })
    .eq("id", workId);
  if (updateErr) {
    console.error("[mockups] update failed:", updateErr.message);
    return NextResponse.json(
      { error: "Could not save mockup" },
      { status: 500 },
    );
  }

  // Mark the render as kept so the GC sweep doesn't delete the file.
  // Best-effort, failure here doesn't unsave the mockup.
  await db
    .from("wall_renders")
    .update({ kept: true })
    .eq("id", renderId);

  return NextResponse.json({ mockup: newMockup }, { status: 201 });
}

/**
 * DELETE, remove a mockup by render_id.
 * Body: { render_id }
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isFlagOn("WALL_VISUALIZER_V1")) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }

  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user!.id;

  const { id: workId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = saveMockupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 400 },
    );
  }
  const renderId = parsed.data.render_id;

  const db = getSupabaseAdmin();

  // Resolve profile + verify ownership (same gate as POST).
  const { data: profileRow } = await db
    .from("artist_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profileRow) {
    return NextResponse.json(
      { error: "Artist profile not found" },
      { status: 403 },
    );
  }

  const { data: workRow } = await db
    .from("artist_works")
    .select("id, artist_id, mockups")
    .eq("id", workId)
    .maybeSingle();
  if (!workRow) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }
  if (
    (workRow as { artist_id: string }).artist_id !==
    (profileRow as { id: string }).id
  ) {
    return NextResponse.json(
      { error: "You don't own this work" },
      { status: 403 },
    );
  }

  const existing = Array.isArray((workRow as { mockups?: unknown }).mockups)
    ? ((workRow as { mockups: ArtistWorkMockup[] }).mockups ?? [])
    : [];
  const next = existing.filter((m) => m.render_id !== renderId);
  if (next.length === existing.length) {
    return NextResponse.json({ ok: true, removed: 0 });
  }

  const { error: updateErr } = await db
    .from("artist_works")
    .update({ mockups: next })
    .eq("id", workId);
  if (updateErr) {
    return NextResponse.json(
      { error: "Could not remove mockup" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, removed: 1 });
}
