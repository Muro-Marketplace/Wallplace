-- ============================================================
-- ORDER LIFECYCLE: Revenue splits, status tracking, customer accounts
-- Run in Supabase SQL Editor after 002_run_me.sql
-- ============================================================

-- Extend orders table for full lifecycle
ALTER TABLE orders ADD COLUMN IF NOT EXISTS artist_slug text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS artist_user_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS venue_slug text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS venue_revenue_share_percent numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS venue_revenue numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS artist_revenue numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_percent numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS placement_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_user_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct';

CREATE INDEX IF NOT EXISTS idx_orders_artist ON orders(artist_slug) WHERE artist_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_venue ON orders(venue_slug) WHERE venue_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_user_id) WHERE buyer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
