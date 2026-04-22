-- Venue profile photo gallery. Each venue can upload images of their
-- actual space so artists and the curation team can see what they'll
-- be hanging work in. Stored as public URLs from the `collections`
-- storage bucket (already configured).
--
-- `image` (singular) on venue_profiles already stores an optional hero
-- image — this column is additive: a gallery of up to ~10 additional
-- photos.
ALTER TABLE venue_profiles
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::TEXT[];

NOTIFY pgrst, 'reload schema';
