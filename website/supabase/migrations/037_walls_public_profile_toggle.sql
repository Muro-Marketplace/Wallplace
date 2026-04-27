-- 037_walls_public_profile_toggle.sql
--
-- Lets venues opt in to showing a saved wall on their public venue
-- profile page. Off by default — same posture as every privacy
-- toggle on the platform: a venue's wall is private until they
-- explicitly publish it.
--
-- Used downstream by:
--   - Venue wall edit form (checkbox to flip the flag)
--   - GET /api/walls (returns is_public_on_profile so the list card
--     can show a "Public" pill)
--   - /venues/[slug] public page (renders the published walls
--     under the venue's gallery section)
--
-- Sub-second migration on the existing walls table.

ALTER TABLE walls
  ADD COLUMN IF NOT EXISTS is_public_on_profile BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN walls.is_public_on_profile IS
  'Venue-controlled flag: when TRUE, this wall is rendered on the venue''s public profile page so artists can see it before requesting placements. Default FALSE (private).';
