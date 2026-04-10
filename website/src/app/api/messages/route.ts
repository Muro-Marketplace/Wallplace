import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: fetch conversations for a user (pass ?slug=artist-slug or ?type=venue)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "slug parameter required" }, { status: 400 });
    }

    // Get all messages where this user is sender or recipient
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`recipient_slug.eq.${slug},sender_name.eq.${slug}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Group by conversation_id and get latest message per conversation
    const conversations: Record<string, {
      conversationId: string;
      latestMessage: string;
      latestSender: string;
      latestSenderType: string;
      otherParty: string;
      unreadCount: number;
      lastActivity: string;
      messageCount: number;
    }> = {};

    (data || []).forEach((msg) => {
      const cid = msg.conversation_id;
      if (!conversations[cid]) {
        const otherParty = msg.recipient_slug === slug ? msg.sender_name : msg.recipient_slug;
        conversations[cid] = {
          conversationId: cid,
          latestMessage: msg.content,
          latestSender: msg.sender_name,
          latestSenderType: msg.sender_type,
          otherParty,
          unreadCount: 0,
          lastActivity: msg.created_at,
          messageCount: 0,
        };
      }
      conversations[cid].messageCount++;
      if (!msg.is_read && msg.recipient_slug === slug) {
        conversations[cid].unreadCount++;
      }
    });

    const sorted = Object.values(conversations).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    return NextResponse.json({ conversations: sorted });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// POST: send a new message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, senderId, senderName, senderType, recipientSlug, content } = body;

    if (!senderName || !recipientSlug || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate conversation ID if not provided (new conversation)
    const cid = conversationId || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { error } = await supabase.from("messages").insert({
      conversation_id: cid,
      sender_id: senderId || null,
      sender_name: senderName,
      sender_type: senderType || "anonymous",
      recipient_slug: recipientSlug,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ success: true, conversationId: cid });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
