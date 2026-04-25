/**
 * /api/walls/[id]
 *
 * GET     fetch a single wall (owner only)
 * PATCH   partial update (name, dimensions, colour, notes)
 * DELETE  remove (cascades to layouts via FK)
 *
 * Ownership:
 *   walls table has a SELECT-own RLS policy — anonymous reads can't
 *   leak rows. Mutations go through the service-role client here, which
 *   bypasses RLS, so we re-check `wall.user_id === auth.user.id` before
 *   touching the row.
 */

import { NextResponse } from "next/server";
import { isFlagOn } from "@/lib/feature-flags";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { updateWallSchema } from "@/lib/visualizer/validations";
import {
  deleteWall,
  getWallById,
  updateWall,
} from "@/lib/visualizer/walls-db";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveAndAuthorize(request: Request, ctx: RouteContext) {
  if (!isFlagOn("WALL_VISUALIZER_V1")) {
    return { errResponse: NextResponse.json({ error: "Not enabled" }, { status: 404 }) };
  }
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return { errResponse: auth.error };

  const { id } = await ctx.params;
  const wall = await getWallById(id);
  if (!wall) {
    return {
      errResponse: NextResponse.json({ error: "Wall not found" }, { status: 404 }),
    };
  }
  if (wall.user_id !== auth.user!.id) {
    // 404 not 403 — don't leak existence to non-owners.
    return {
      errResponse: NextResponse.json({ error: "Wall not found" }, { status: 404 }),
    };
  }
  return { wall, userId: auth.user!.id };
}

export async function GET(request: Request, ctx: RouteContext) {
  const r = await resolveAndAuthorize(request, ctx);
  if (r.errResponse) return r.errResponse;
  return NextResponse.json({ wall: r.wall });
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const r = await resolveAndAuthorize(request, ctx);
  if (r.errResponse) return r.errResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateWallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = await updateWall(r.wall!.id, {
    name: parsed.data.name,
    width_cm: parsed.data.width_cm,
    height_cm: parsed.data.height_cm,
    wall_color_hex: parsed.data.wall_color_hex,
    notes: parsed.data.notes ?? undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not update wall" }, { status: 500 });
  }
  return NextResponse.json({ wall: updated });
}

export async function DELETE(request: Request, ctx: RouteContext) {
  const r = await resolveAndAuthorize(request, ctx);
  if (r.errResponse) return r.errResponse;

  const ok = await deleteWall(r.wall!.id);
  if (!ok) {
    return NextResponse.json({ error: "Could not delete wall" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
