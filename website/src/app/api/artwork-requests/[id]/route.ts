// /api/artwork-requests/[id] — read one request + close it.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["open", "closed", "fulfilled"]).optional(),
  visibility: z.enum(["public", "semi_public", "private"]).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getSupabaseAdmin();
  const { data: req } = await db.from("artwork_requests").select("*").eq("id", id).maybeSingle();
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Pull responses (artist replies) too.
  const { data: responses } = await db
    .from("artwork_request_responses")
    .select("*")
    .eq("request_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ request: req, responses: responses || [] });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: existing } = await db.from("artwork_requests").select("venue_user_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.venue_user_id !== auth.user!.id) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.visibility) updates.visibility = parsed.data.visibility;
  if (parsed.data.status === "closed" || parsed.data.status === "fulfilled") {
    updates.closed_at = new Date().toISOString();
  }

  const { error } = await db.from("artwork_requests").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update" }, { status: 500 });
  return NextResponse.json({ success: true });
}
