import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { user, error } = await getAuthenticatedUser(request);
  if (!user) return error;

  const db = getSupabaseAdmin();

  // Check both profile tables for a Connect account
  const { data: artistProfile } = await db
    .from("artist_profiles")
    .select("stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  const { data: venueProfile } = await db
    .from("venue_profiles")
    .select("stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  const accountId =
    artistProfile?.stripe_connect_account_id ||
    venueProfile?.stripe_connect_account_id;

  if (!accountId) {
    return NextResponse.json({ hasAccount: false });
  }

  const account = await stripe.accounts.retrieve(accountId);

  return NextResponse.json({
    hasAccount: true,
    onboardingComplete:
      account.charges_enabled && account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });
}
