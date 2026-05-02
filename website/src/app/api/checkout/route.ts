import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validations";
import { calculateOrderShipping } from "@/lib/shipping-checkout";
import { regionForCountry, isSupportedCountry } from "@/lib/iso-countries";
import { saveCartSession } from "@/lib/cart-sessions";

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
    // Fulfilment method — 'ship' (default), 'collection' (drop-off at
    // the artist's space), or 'digital'. Validated server-side, not
    // trusted from the client beyond the enum.
    const fulfilmentMethod: "ship" | "collection" | "digital" =
      body.fulfilmentMethod === "collection" || body.fulfilmentMethod === "digital"
        ? body.fulfilmentMethod
        : "ship";
    const collectionNotes = typeof body.collectionNotes === "string" ? body.collectionNotes.slice(0, 1000) : "";

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

    // Cart-level shipping via the shared helper. Uses the same per-artist
    // consolidation rule (largest piece full + 50% per additional) as the
    // checkout display page, so the £ shown to the buyer matches what
    // Stripe charges to the card. Before this, the API used a flat
    // (item.shippingPrice ?? 9.95) * quantity calc and could produce a
    // different total, the £80.49 vs £79.94 mismatch.
    if (!isSupportedCountry(shipping.country)) {
      return NextResponse.json(
        { error: `We don't ship to ${shipping.country} yet.` },
        { status: 400 },
      );
    }
    const region = regionForCountry(shipping.country);
    const { totalShipping } = calculateOrderShipping(
      items.map((it) => ({
        artistSlug: it.artistSlug || "",
        artistName: it.artistName || "Artist",
        shippingPrice: it.shippingPrice ?? null,
        internationalShippingPrice: it.internationalShippingPrice ?? null,
        dimensions: it.dimensions || null,
        framed: it.framed ?? false,
        price: it.price,
        quantity: it.quantity,
      })),
      region,
    );

    // Defensive divergence check, the frontend passes the figure it
    // computed; if the API computes something different, we trust the
    // API's number (it's the one Stripe sees) but log a warning so we
    // can chase any data drift.
    if (typeof body.expectedShippingCost === "number" &&
        Math.abs(body.expectedShippingCost - totalShipping) > 0.01) {
      console.warn("[checkout] shipping divergence", {
        expected: body.expectedShippingCost,
        computed: totalShipping,
      });
    }

    // Collection / digital skip shipping costs by definition — buyer
    // picks up from the artist (or the work is intangible).
    if (totalShipping > 0 && fulfilmentMethod === "ship") {
      lineItems.push({
        price_data: {
          currency: "gbp",
          product_data: {
            name: "Shipping",
            description: "Delivery costs set by artist",
          },
          unit_amount: Math.round(totalShipping * 100),
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

    const artistSlugs = [...new Set(items.map((i) => i.artistSlug || "").filter(Boolean))];
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Create Stripe Checkout Session. Metadata is intentionally slim —
    // full cart + shipping live in cart_sessions (Plan B Task 6). Stripe
    // caps each metadata value at 500 chars, which used to truncate
    // large carts; that's no longer a constraint here.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: shipping.email,
      metadata: {
        kind: "cart_checkout",
        source,
        venue_slug: venueSlug,
        artist_slugs: artistSlugs.join(","),
        fulfilment_method: fulfilmentMethod,
      },
      success_url: `${origin}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });

    // Persist the full cart server-side so the webhook + confirmation
    // page have the un-truncated payload available. Failure here is
    // fatal — without the row, the webhook can't process the order.
    await saveCartSession({
      stripeSessionId: session.id,
      cart: items,
      shipping: { ...shipping, fulfilmentMethod, collectionNotes },
      source,
      venueSlug,
      artistSlugs,
      expectedSubtotalPence: Math.round(subtotal * 100),
      expectedShippingPence: Math.round(totalShipping * 100),
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
