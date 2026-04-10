import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, shipping } = body;

    if (!items || items.length === 0 || !shipping) {
      return NextResponse.json({ error: "Cart items and shipping required" }, { status: 400 });
    }

    // Build Stripe line items from cart
    const lineItems = items.map((item: {
      title: string;
      artistName: string;
      size: string;
      price: number;
      quantity: number;
      image?: string;
    }) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.title,
          description: `${item.artistName} – ${item.size}`,
          ...(item.image && !item.image.startsWith("data:") ? { images: [item.image] } : {}),
        },
        unit_amount: Math.round(item.price * 100), // Convert £ to pence
      },
      quantity: item.quantity,
    }));

    // Calculate shipping
    const subtotal = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    );
    const shippingCost = subtotal >= 300 ? 0 : 9.95;

    // Add shipping as a line item if applicable
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          product_data: {
            name: "Shipping",
            description: "Standard delivery (free on orders over £300)",
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Determine base URL
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: shipping.email,
      metadata: {
        shipping_name: shipping.fullName,
        shipping_email: shipping.email,
        shipping_phone: shipping.phone || "",
        shipping_address1: shipping.addressLine1,
        shipping_address2: shipping.addressLine2 || "",
        shipping_city: shipping.city,
        shipping_postcode: shipping.postcode,
        shipping_country: shipping.country || "United Kingdom",
        shipping_notes: shipping.notes || "",
        cart_items: JSON.stringify(items).slice(0, 500), // Metadata limited to 500 chars
      },
      success_url: `${origin}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
