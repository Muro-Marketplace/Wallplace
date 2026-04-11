import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET: fetch all messages in a conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const { conversationId } = await params;

    if (!conversationId || conversationId.length > 200) {
      return NextResponse.json({ error: "Valid conversation ID required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: data || [] });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH: mark messages as read
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const { conversationId } = await params;
    const body = await request.json();
    const { readerSlug } = body;

    if (!readerSlug || typeof readerSlug !== "string" || readerSlug.length > 100) {
      return NextResponse.json({ error: "Valid readerSlug required" }, { status: 400 });
    }

    const safeSlug = readerSlug.replace(/[^a-zA-Z0-9_-]/g, "");

    const db = getSupabaseAdmin();
    const { error } = await db
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("recipient_slug", safeSlug)
      .eq("is_read", false);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE: delete all messages in a conversation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  try {
    const { conversationId } = await params;

    if (!conversationId || conversationId.length > 200) {
      return NextResponse.json({ error: "Valid conversation ID required" }, { status: 400 });
    }

    // Verify user is a participant in this conversation
    const db = getSupabaseAdmin();

    // Get user's slug
    const { data: artistProfile } = await db.from("artist_profiles").select("slug").eq("user_id", auth.user!.id).single();
    const { data: venueProfile } = !artistProfile
      ? await db.from("venue_profiles").select("slug").eq("user_id", auth.user!.id).single()
      : { data: null };
    const userSlug = artistProfile?.slug || venueProfile?.slug;

    if (!userSlug) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    // Check that user is part of this conversation
    const { data: msgs } = await db
      .from("messages")
      .select("sender_name, recipient_slug")
      .eq("conversation_id", conversationId)
      .limit(1);

    if (!msgs || msgs.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const msg = msgs[0];
    if (msg.sender_name !== userSlug && msg.recipient_slug !== userSlug) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }

    const { error } = await db
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
