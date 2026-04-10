import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    return NextResponse.json({
      id: session.id,
      status: session.payment_status,
      amountTotal: (session.amount_total || 0) / 100,
      customerEmail: session.customer_email,
      metadata: session.metadata,
      lineItems: session.line_items?.data.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        amount: (item.amount_total || 0) / 100,
      })),
    });
  } catch (err) {
    console.error("Session retrieval error:", err);
    return NextResponse.json({ error: "Failed to retrieve session" }, { status: 500 });
  }
}
