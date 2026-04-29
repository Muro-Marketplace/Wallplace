-- 038_placement_inventory_attribution.sql
--
-- Stock + revenue + venue attribution for placed works. Adds two
-- columns on artist_works to mirror placement state on the work for
-- cheap reads, one counter on placements, an atomic SQL function for
-- attribution, and partial indexes to keep the lookup queries fast.
--
-- Idempotent (uses IF NOT EXISTS / OR REPLACE) so re-runs are safe.

ALTER TABLE artist_works
  ADD COLUMN IF NOT EXISTS placed_at_venue TEXT,
  ADD COLUMN IF NOT EXISTS current_placement_id TEXT;

CREATE INDEX IF NOT EXISTS idx_artist_works_current_placement
  ON artist_works(current_placement_id)
  WHERE current_placement_id IS NOT NULL;

ALTER TABLE placements
  ADD COLUMN IF NOT EXISTS delivery_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_placement_delivered
  ON orders(placement_id)
  WHERE placement_id IS NOT NULL AND status = 'delivered';

-- Atomic revenue attribution. Called from the orders PATCH handler
-- when an order transitions to delivered. The caller is responsible
-- for idempotency (status_history check); this function does the
-- bare add + counter bump.
CREATE OR REPLACE FUNCTION increment_placement_revenue(
  p_placement_id TEXT,
  p_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
  UPDATE placements
  SET revenue = COALESCE(revenue, 0) + p_amount,
      delivery_count = delivery_count + 1
  WHERE id = p_placement_id;
END;
$$ LANGUAGE plpgsql;
