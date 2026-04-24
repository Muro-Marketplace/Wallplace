-- Venue "Display Needs" — replaces hardcoded placeholder strings with
-- real fields the venue can fill in themselves. All optional.
ALTER TABLE venue_profiles
  ADD COLUMN IF NOT EXISTS display_wall_space TEXT,
  ADD COLUMN IF NOT EXISTS display_lighting TEXT,
  ADD COLUMN IF NOT EXISTS display_install_notes TEXT,
  ADD COLUMN IF NOT EXISTS display_rotation_frequency TEXT;
