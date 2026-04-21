-- Adds artist-authored description and additional images per artwork.
-- `images` holds EXTRA images beyond the primary `image` column, in display order.

ALTER TABLE artist_works
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
