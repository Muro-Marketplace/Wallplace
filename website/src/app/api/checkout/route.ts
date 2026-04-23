import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Cart items and shipping required" }, { status: 400 });
    }

    const { items, shipping } = parsed.data;
    const source = body.source || "direct";
    const venueSlug = body.venueSlug || "";

    // Build Stripe line items from cart
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.title,
          description: `${item.artistName} – ${item.size}`,
          ...(item.image && !item.image.startsWith("data:") ? { images: [item.image] } : {}),
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Calculate per-item shipping
    const DEFAULT_SHIPPING = 9.95;
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingCost = items.reduce(
      (sum, item) => sum + (item.shippingPrice ?? DEFAULT_SHIPPING) * item.quantity,
      0
    );

    // Add shipping as a line item if applicable
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          product_data: {
            name: "Shipping",
            description: "Delivery costs set by artist",
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Prefer the caller's origin so local dev redirects back to
    // localhost instead of hitting the production domain. Fall back to
    // the configured site URL (set on Vercel) and finally localhost for
    // completeness. NEXT_PUBLIC_SITE_URL can be pinned to production
    // via env to stop spoofing in server-to-server callers that don't
    // set Origin.
    const requestOrigin = request.headers.get("origin");
    const origin = requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
        cart_items: JSON.stringify(items.map(i => ({ title: i.title, qty: i.quantity, price: i.price, artistSlug: i.artistSlug || "" }))).slice(0, 500),
        source,
        venue_slug: venueSlug,
        artist_slugs: [...new Set(items.map(i => i.artistSlug || "").filter(Boolean))].join(","),
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
