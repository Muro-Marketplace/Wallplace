import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedUser(request);
  if (!user) return error;

  const { accountType } = await request.json();
  if (accountType !== "venue" && accountType !== "artist") {
    return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const table = accountType === "venue" ? "venue_profiles" : "artist_profiles";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  // Look up the profile for this user
  const { data: profile, error: profileError } = await db
    .from(table)
    .select("stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let accountId = profile.stripe_connect_account_id;

  // Create Express account if one doesn't exist yet
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { user_id: user.id, account_type: accountType },
    });

    accountId = account.id;

    // Store the account ID on the profile
    await db
      .from(table)
      .update({ stripe_connect_account_id: accountId })
      .eq("user_id", user.id);
  }

  // Create an Account Link for onboarding
  const refreshUrl =
    accountType === "venue"
      ? `${siteUrl}/venue-portal/settings?stripe_connect=refresh`
      : `${siteUrl}/artist-portal/billing?stripe_connect=refresh`;
  const returnUrl =
    accountType === "venue"
      ? `${siteUrl}/venue-portal/settings?stripe_connect=complete`
      : `${siteUrl}/artist-portal/billing?stripe_connect=complete`;

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
