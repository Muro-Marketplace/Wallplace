// Pre-flight check: can this artist actually receive a payment right
// now? An artist whose Stripe Connect account exists but isn't
// charges_enabled (e.g. mid-KYC) would silently fail at transfer time.
// We cache the answer for 60 seconds in artist_profiles to avoid
// hammering Stripe on every checkout.

import { stripe } from "./stripe";
import { getSupabaseAdmin } from "./supabase-admin";

const CACHE_TTL_MS = 60_000;

export async function canArtistAcceptOrders(slug: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data: profile } = await db
    .from("artist_profiles")
    .select("stripe_connect_account_id, stripe_charges_enabled, stripe_charges_checked_at")
    .eq("slug", slug)
    .single();

  if (!profile?.stripe_connect_account_id) return false;

  const checkedAt = profile.stripe_charges_checked_at
    ? new Date(profile.stripe_charges_checked_at).getTime()
    : 0;
  if (
    profile.stripe_charges_enabled !== null &&
    Date.now() - checkedAt < CACHE_TTL_MS
  ) {
    return profile.stripe_charges_enabled;
  }

  // Cache miss / stale — ask Stripe.
  try {
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    const charges = account.charges_enabled ?? false;
    await db
      .from("artist_profiles")
      .update({
        stripe_charges_enabled: charges,
        stripe_charges_checked_at: new Date().toISOString(),
      })
      .eq("slug", slug);
    return charges;
  } catch (err) {
    console.error("[connect-status] retrieve failed:", err);
    // Fail closed — if we can't verify, we don't take the order.
    return false;
  }
}
