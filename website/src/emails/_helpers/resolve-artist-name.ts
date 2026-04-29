import type { SupabaseClient } from "@supabase/supabase-js";

// "alex-2" / "maya-chen" / "abc" — slug-shaped strings the upstream
// callers sometimes pass in place of a real display name. Anything
// containing whitespace, capitals, or back-to-back hyphens is
// presumed to be a real human-typed name and used as-is.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function looksLikeSlug(s: string | null | undefined): boolean {
  if (!s) return false;
  return SLUG_RE.test(s.trim());
}

/** Resolve a single artist's display name. Prefers a non-slug-shaped
 *  fallback (already a real name); otherwise looks up by slug; finally
 *  falls back to the slug itself or "Artist". */
export async function resolveArtistName(
  db: SupabaseClient,
  slug: string | null | undefined,
  fallbackName?: string | null,
): Promise<string> {
  if (fallbackName && !looksLikeSlug(fallbackName)) return fallbackName.trim();
  if (!slug) return fallbackName?.trim() || "Artist";
  const { data } = await db
    .from("artist_profiles")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  return data?.name?.trim() || fallbackName?.trim() || slug;
}

/** Bulk-resolve unique slugs to display names in a single round-trip.
 *  Used by webhook callers building OrderItem[] for emails. */
export async function resolveArtistNamesBulk(
  db: SupabaseClient,
  slugs: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const cleaned = Array.from(new Set(slugs.filter((s): s is string => !!s)));
  if (cleaned.length === 0) return new Map();
  const { data } = await db
    .from("artist_profiles")
    .select("slug, name")
    .in("slug", cleaned);
  const map = new Map<string, string>();
  for (const row of data || []) {
    if (row.slug && row.name) map.set(row.slug, row.name);
  }
  return map;
}
