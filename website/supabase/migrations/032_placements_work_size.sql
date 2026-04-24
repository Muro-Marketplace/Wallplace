-- Size of the primary work on a placement. Previously we only persisted
-- sizes on extra_works, so the primary work rendered without the size
-- the venue / artist picked at request time.
ALTER TABLE placements
  ADD COLUMN IF NOT EXISTS work_size TEXT;
