-- 040_backfill_placed_at_venue.sql
--
-- Backfill placed_at_venue + current_placement_id on artist_works for
-- the 30 existing active placements. Plan C's PATCH handler only fires
-- on the pending → active transition; placements that were already
-- active when migration 038 landed never got stamped.
--
-- Production placements schema stores work data denormalised:
--   work_title, work_image, work_size, plus extra_works JSONB array
-- (each entry is { title, image, size }). No FK to artist_works.id.
-- Match by title within the artist's portfolio.
--
-- Display-only on purpose: intentionally does NOT decrement
-- quantity_available retroactively. The order webhook decrements stock
-- at sale time; doing it again here for prior sales would double-count.
-- New active transitions going forward will decrement at acceptance via
-- the patched route handler.

WITH active_placement_titles AS (
  -- Primary work on each active placement.
  SELECT
    p.id AS placement_id,
    ap.id AS artist_id,
    COALESCE(vp.name, p.venue) AS venue_name,
    p.work_title AS title
  FROM placements p
  LEFT JOIN artist_profiles ap ON ap.user_id = p.artist_user_id
  LEFT JOIN venue_profiles vp ON vp.user_id = p.venue_user_id
  WHERE p.status = 'active'
    AND p.work_title IS NOT NULL
    AND p.work_title <> ''

  UNION ALL

  -- Extra works on each active placement (extra_works is a JSONB array
  -- of objects with title/image/size). Skip rows where extra_works is
  -- NULL or a non-array scalar.
  SELECT
    p.id,
    ap.id,
    COALESCE(vp.name, p.venue),
    ew.value->>'title' AS title
  FROM placements p
  LEFT JOIN artist_profiles ap ON ap.user_id = p.artist_user_id
  LEFT JOIN venue_profiles vp ON vp.user_id = p.venue_user_id
  CROSS JOIN LATERAL jsonb_array_elements(p.extra_works) AS ew
  WHERE p.status = 'active'
    AND p.extra_works IS NOT NULL
    AND jsonb_typeof(p.extra_works) = 'array'
    AND ew.value->>'title' IS NOT NULL
)
UPDATE artist_works aw
SET placed_at_venue = mp.venue_name,
    current_placement_id = mp.placement_id
FROM active_placement_titles mp
WHERE aw.artist_id = mp.artist_id
  AND aw.title = mp.title
  AND aw.placed_at_venue IS NULL;
