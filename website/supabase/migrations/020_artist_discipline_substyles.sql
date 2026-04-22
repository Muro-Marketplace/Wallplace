-- Phase 3: Replace the old category/medium/theme/style-tag taxonomy with a single
-- discipline + flat sub-styles model.
--
-- The old primary_medium/themes/style_tags columns stay put for now so that any
-- display logic (artist cards, gallery labels, etc.) keeps rendering while we
-- migrate. This migration just adds the new columns and seeds them from the
-- existing data on a best-effort basis.

ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS discipline TEXT,
  ADD COLUMN IF NOT EXISTS sub_styles TEXT[] DEFAULT '{}';

-- Best-effort backfill from existing primary_medium
UPDATE artist_profiles SET discipline = CASE
  WHEN primary_medium ILIKE '%photo%' THEN 'photography'
  WHEN primary_medium ILIKE '%paint%' THEN 'painting'
  WHEN primary_medium ILIKE '%digital%' OR primary_medium ILIKE '%ai%' THEN 'digital'
  WHEN primary_medium ILIKE '%illustra%' OR primary_medium ILIKE '%drawing%' THEN 'drawing'
  WHEN primary_medium ILIKE '%sketch%' THEN 'sketching'
  WHEN primary_medium ILIKE '%sculpt%' THEN 'sculpture'
  ELSE 'mixed'
END
WHERE discipline IS NULL;

-- Best-effort sub_styles seed: merge themes + style_tags into lowercase/slugged values
UPDATE artist_profiles SET sub_styles = (
  SELECT ARRAY(
    SELECT DISTINCT lower(replace(trim(val), ' ', '-'))
    FROM unnest(coalesce(themes, '{}') || coalesce(style_tags, '{}')) AS val
    WHERE length(trim(val)) > 0
  )
) WHERE sub_styles = '{}' OR sub_styles IS NULL;

-- Also mirror the new columns on artist_applications so that applicants can
-- self-select their discipline + sub-styles up-front and admins can pass them
-- straight through when creating the artist profile on accept.
ALTER TABLE artist_applications
  ADD COLUMN IF NOT EXISTS discipline TEXT,
  ADD COLUMN IF NOT EXISTS sub_styles TEXT[] DEFAULT '{}';
