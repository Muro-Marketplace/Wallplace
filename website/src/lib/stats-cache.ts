import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Recompute per-artist stats from analytics_events, placements, and enquiries.
 * Updates the cached columns on artist_profiles. Call from daily cron or admin endpoint.
 */
export async function refreshArtistStatsCaches(): Promise<{ updated: number; errors: string[] }> {
  const db = getSupabaseAdmin();
  const errors: string[] = [];

  // Get all artist profiles
  const { data: profiles, error: profilesErr } = await db
    .from("artist_profiles")
    .select("id, slug, user_id");

  if (profilesErr || !profiles) {
    return { updated: 0, errors: [`Failed to fetch profiles: ${profilesErr?.message}`] };
  }

  let updated = 0;

  for (const profile of profiles) {
    try {
      // Count profile views from analytics_events
      const { count: viewCount } = await db
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("artist_slug", profile.slug)
        .eq("event_type", "profile_view");

      // Count active placements
      const { count: placementCount } = await db
        .from("placements")
        .select("id", { count: "exact", head: true })
        .eq("artist_user_id", profile.user_id)
        .eq("status", "active");

      // Count sold works (completed placements or works marked unavailable)
      const { count: salesCount } = await db
        .from("placements")
        .select("id", { count: "exact", head: true })
        .eq("artist_user_id", profile.user_id)
        .in("status", ["completed"]);

      // Count enquiries
      const { count: enquiryCount } = await db
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .eq("artist_slug", profile.slug);

      const { error: updateErr } = await db
        .from("artist_profiles")
        .update({
          total_views: viewCount || 0,
          total_placements: placementCount || 0,
          total_sales: salesCount || 0,
          total_enquiries: enquiryCount || 0,
        })
        .eq("id", profile.id);

      if (updateErr) {
        errors.push(`Failed to update ${profile.slug}: ${updateErr.message}`);
      } else {
        updated++;
      }
    } catch (err) {
      errors.push(`Error processing ${profile.slug}: ${err}`);
    }
  }

  return { updated, errors };
}
