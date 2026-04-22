-- The unique constraint on (artist_slug, venue_slug) for active placements
-- was too strict: a venue can legitimately hold multiple artworks from
-- the same artist at the same time (e.g. a whole wall). Dropping the
-- index so the workflow isn't blocked. Application-level logic still
-- prevents a venue from creating the exact same placement_id twice.

DROP INDEX IF EXISTS idx_placements_unique_active;
