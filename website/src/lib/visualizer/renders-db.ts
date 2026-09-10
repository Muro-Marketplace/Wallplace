/**
 * Render persistence, insert into wall_renders + upload to Storage.
 *
 * Storage layout:
 *   wall-renders/{user_id}/{render_id}.webp   (or .png for a browser
 *   capture from a browser that can't encode WebP; `contentType` decides)
 *
 *   The bucket is PRIVATE (migration 140). It holds composites built from
 *   `wall-photos`, which was already private, so publishing the derivative
 *   republished the venue's own interior photograph at an open URL. Reads
 *   go through a short-lived signed URL; see getRenderUrl below.
 *
 *   The one place a render is meant to become public is an artist promoting
 *   it to a mockup on their listing, and api/works/[id]/mockups copies the
 *   object into the public `artworks` bucket to do that. Deliberate publish,
 *   not publish-by-default.
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signedUrlFor } from "@/lib/storage-refs";
import type { RenderKind, WallRender } from "./types";

const RENDERS_BUCKET = "wall-renders";

export type RenderContentType = "image/webp" | "image/png";

const EXTENSION_FOR: Record<RenderContentType, string> = {
  "image/webp": "webp",
  "image/png": "png",
};

export interface PersistRenderInput {
  userId: string;
  layoutId: string | null;
  kind: RenderKind;
  layoutHash: string;
  costUnits: number;
  imageBuffer: Buffer;
  /** What `imageBuffer` holds. Defaults to WebP, which sharp produces. */
  contentType?: RenderContentType;
  /** Optional provider tag (null for the MVP non-AI compositor). */
  provider?: string | null;
  /** Optional prompt seed when AI provider used. */
  promptSeed?: Record<string, unknown> | null;
}

export interface PersistRenderResult {
  render: WallRender;
  /**
   * Short-lived signed URL the client can fetch immediately. Null when the
   * object stored but could not be signed, which the caller should surface as
   * a missing preview rather than a failed render.
   */
  url: string | null;
}

/**
 * Upload the render bytes to Supabase Storage, then insert a wall_renders
 * row. Returns the persisted record + a signed URL. On any failure,
 * the inserted Storage object is left in place, that's cheap to rewrite
 * (next call replaces) and avoids leaving orphan DB rows.
 */
export async function persistRender(
  input: PersistRenderInput,
  client?: SupabaseClient,
): Promise<PersistRenderResult | null> {
  const db = client ?? getSupabaseAdmin();
  const renderId = randomUUID();
  const contentType: RenderContentType = input.contentType ?? "image/webp";
  const path = `${input.userId}/${renderId}.${EXTENSION_FOR[contentType]}`;

  // 1. Upload bytes.
  const { error: uploadErr } = await db.storage
    .from(RENDERS_BUCKET)
    .upload(path, input.imageBuffer, {
      contentType,
      cacheControl: "604800",
      upsert: false,
    });
  if (uploadErr) {
    console.error("[renders-db] upload failed:", uploadErr.message);
    return null;
  }

  // 2. Insert DB row with the same id so we can correlate.
  const { data, error: insertErr } = await db
    .from("wall_renders")
    .insert({
      id: renderId,
      layout_id: input.layoutId,
      user_id: input.userId,
      kind: input.kind,
      output_path: path,
      layout_hash: input.layoutHash,
      // Migration 035 constrains this column to 1..10, because every render
      // cost a quota unit when the table was designed. A client capture costs
      // nothing, and 0 is rejected outright, so a free render records the
      // minimum. Nothing is charged by this: quota is summed from the
      // visualizer_usage ledger, and a free capture writes no row there.
      cost_units: Math.max(1, Math.min(10, Math.round(input.costUnits))),
      provider: input.provider ?? null,
      prompt_seed: input.promptSeed ?? null,
    })
    .select("*")
    .single();
  if (insertErr || !data) {
    console.error(
      "[renders-db] insert failed (file uploaded but not recorded):",
      insertErr?.message,
    );
    return null;
  }

  // 3. Resolve a signed read URL.
  const url = await getRenderUrl(path, db);

  return {
    render: {
      id: data.id,
      layout_id: data.layout_id,
      user_id: data.user_id,
      kind: data.kind,
      output_path: data.output_path,
      layout_hash: data.layout_hash,
      cost_units: data.cost_units,
      kept: data.kept,
      provider: data.provider,
      prompt_seed: data.prompt_seed,
      created_at: data.created_at,
    },
    url,
  };
}

/**
 * Resolve a render path (as stored in `wall_renders.output_path`) to a signed,
 * short-lived URL. Used on cache hits too: we re-derive the URL from the
 * cached row's `output_path` rather than persisting URLs, which is what makes
 * moving the bucket to private a config change rather than a data migration.
 *
 * Returns null when the object cannot be signed. Every caller treats that as
 * "no preview available", never as an error.
 */
export async function getRenderUrl(
  path: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const db = client ?? getSupabaseAdmin();
  return signedUrlFor(db, RENDERS_BUCKET, path);
}

/** The bucket renders live in. Exported so the mockup copier can read from it. */
export { RENDERS_BUCKET };
