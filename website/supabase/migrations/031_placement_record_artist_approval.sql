-- Bilateral approval for loan / consignment records. Previously only the
-- venue ticked; the artist's sign-off was implicit. Now both parties must
-- approve before the record counts as finalised.
ALTER TABLE placement_records
  ADD COLUMN IF NOT EXISTS artist_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS artist_approved_at TIMESTAMPTZ;
