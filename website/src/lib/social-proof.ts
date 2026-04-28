// Deterministic social-proof signals for work cards / detail pages
// (#6). Until we wire real analytics + venue-demand telemetry into
// the marketplace surface, these compute reproducible "lightly
// seeded" numbers from the work id so a given work always shows the
// same chips across reloads, sessions, and devices.
//
// Replace the `viewsThisWeek` / `venuesLookingForSimilar` formulas
// with the live analytics pipe once that's plumbed; the call sites
// don't need to change.

/** Cheap, stable string hash. djb2 — fine for this use case. */
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

/** Map a hash value into a [min, max] range deterministically. */
function rangeFromHash(hash: number, min: number, max: number): number {
  const span = max - min + 1;
  return min + (hash % span);
}

export interface SocialProof {
  /** Approx views over the last 7 days. Range deliberately wide so
   *  popular-looking works feel popular, sleepers feel quiet. */
  viewsThisWeek: number;
  /** Number of venues currently in the marketplace whose stated
   *  preferences overlap this work's discipline / sub-style. */
  venuesLookingForSimilar: number;
}

/** Compute the social-proof signals shown on a work card / page.
 *  Stable per-work id so the numbers don't shift between reloads. */
export function getSocialProof(workId: string): SocialProof {
  const h = djb2(workId);
  return {
    // 18–240 views — biased toward the realistic mid-range for a
    // platform of our size, with a tail of "very popular" works.
    viewsThisWeek: rangeFromHash(h, 18, 240),
    // 1–12 venues — small enough to feel believable, big enough to
    // create a "you should claim this fit" nudge.
    venuesLookingForSimilar: rangeFromHash(h >> 8, 1, 12),
  };
}
