/**
 * /api/walls
 *
 * GET   list the current user's walls
 * POST  create a new wall (preset or uploaded)
 *
 * Tier caps:
 *   POST checks `getTierLimits(tier).saved_walls` against the current
 *   wall count. -1 = unlimited; 0 = no saving permitted; otherwise the
 *   creation is rejected with a 402 (Payment Required — i.e. upgrade)
 *   when the cap is hit.
 */

import { NextResponse } from "next/server";
import { isFlagOn } from "@/lib/feature-flags";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { createWallSchema } from "@/lib/visualizer/validations";
import { resolveTier } from "@/lib/visualizer/tier-resolver";
import { getTierLimits } from "@/lib/visualizer/tier-limits";
import {
  countWallsByUser,
  createPresetWall,
  createUploadedWall,
  listWallsByUser,
} from "@/lib/visualizer/walls-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isFlagOn("WALL_VISUALIZER_V1")) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const walls = await listWallsByUser(auth.user!.id);
  return NextResponse.json({ walls });
}

export async function POST(request: Request) {
  if (!isFlagOn("WALL_VISUALIZER_V1")) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createWallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Tier cap on saved walls.
  const tier = await resolveTier({
    userId: auth.user!.id,
    ownerTypeHint: parsed.data.owner_type,
  });
  const limits = getTierLimits(tier);
  if (limits.saved_walls === 0) {
    return NextResponse.json(
      {
        error: "Saving walls isn't included on your plan.",
        reason: "saved_walls_not_allowed",
        tier,
      },
      { status: 402 },
    );
  }
  if (limits.saved_walls > 0) {
    const existing = await countWallsByUser(auth.user!.id);
    if (existing >= limits.saved_walls) {
      return NextResponse.json(
        {
          error: `You've used all ${limits.saved_walls} saved wall${limits.saved_walls === 1 ? "" : "s"} on your plan.`,
          reason: "saved_walls_cap",
          tier,
          cap: limits.saved_walls,
        },
        { status: 402 },
      );
    }
  }

  // Insert.
  const wall =
    parsed.data.kind === "preset"
      ? await createPresetWall({
          user_id: auth.user!.id,
          owner_type: parsed.data.owner_type,
          name: parsed.data.name,
          preset_id: parsed.data.preset_id,
          width_cm: parsed.data.width_cm,
          height_cm: parsed.data.height_cm,
          wall_color_hex: parsed.data.wall_color_hex,
          notes: parsed.data.notes ?? null,
        })
      : await createUploadedWall({
          user_id: auth.user!.id,
          owner_type: parsed.data.owner_type,
          name: parsed.data.name,
          source_image_path: parsed.data.source_image_path,
          width_cm: parsed.data.width_cm,
          height_cm: parsed.data.height_cm,
          wall_color_hex: parsed.data.wall_color_hex,
          notes: parsed.data.notes ?? null,
        });

  if (!wall) {
    return NextResponse.json(
      { error: "Could not create wall" },
      { status: 500 },
    );
  }

  return NextResponse.json({ wall }, { status: 201 });
}
