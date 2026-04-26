-- 036_review_status_default_pending.sql
--
-- Flip artist_profiles.review_status default from 'approved' (set in
-- migration 023) to 'pending'. The original default was a hangover
-- from the first iteration when the marketplace had no curation step
-- and every signed-up artist was immediately public. With the
-- account-first /signup/artist + /apply flow now live, a brand-new
-- artist could create a profile via the artist portal BEFORE admin
-- review and land on the public marketplace immediately — exactly
-- the surface area an admin reviewer is supposed to gate.
--
-- Existing rows are left alone: the column is NOT NULL, so an
-- ALTER COLUMN SET DEFAULT only affects future INSERTs that don't
-- supply a value. Previously-approved artists stay approved; this
-- migration is forward-only.

ALTER TABLE artist_profiles
  ALTER COLUMN review_status SET DEFAULT 'pending';
