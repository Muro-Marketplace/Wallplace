-- ============================================
-- Migration 027: Multi-artwork placements
-- ============================================
--
-- Until now a placement has been one artwork. When a venue wanted to
-- take four pieces from an artist we created four separate placements
-- with identical commercial terms, which cluttered the list, split
-- the negotiation log across four threads, and forced repeated
-- counter-offers for what is commercially a single deal.
--
-- From now on a placement keeps a single "primary" work in the
-- existing work_title / work_image columns (backwards-compatible
-- with every read path that hits those columns today) plus an
-- optional `extra_works` JSONB array of additional pieces that share
-- the same lifecycle, terms, and conversation. Each entry is:
--   { title, image, size? }
-- The application layer treats the primary + extras as a single list
-- when rendering; if `extra_works` is null the placement behaves
-- exactly like before.

ALTER TABLE placements
  ADD COLUMN IF NOT EXISTS extra_works JSONB;

COMMENT ON COLUMN placements.extra_works IS
  'Additional works sharing this placement''s lifecycle + terms. JSONB array of { title, image, size? }. NULL = single-work placement (legacy).';
