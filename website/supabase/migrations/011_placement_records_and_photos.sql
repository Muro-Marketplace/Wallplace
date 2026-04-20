-- ============================================
-- Migration 011: Placement records + photos (F15, F16)
-- - placement_records: loan/consignment metadata, 1:1 with placements
-- - placement_photos: optional in-venue photos uploaded by either party
-- ============================================

CREATE TABLE IF NOT EXISTS placement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id TEXT NOT NULL UNIQUE REFERENCES placements(id) ON DELETE CASCADE,
  artwork_id TEXT REFERENCES artist_works(id) ON DELETE SET NULL,
  artist_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  venue_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  record_type TEXT NOT NULL DEFAULT 'loan' CHECK (record_type IN ('loan', 'consignment')),
  qr_enabled BOOLEAN DEFAULT TRUE,

  start_date DATE,
  review_date DATE,
  collection_date DATE,

  agreed_value_gbp NUMERIC,
  insured_value_gbp NUMERIC,
  sale_price_gbp NUMERIC,
  venue_share_percent NUMERIC,
  platform_commission_percent NUMERIC,
  artist_payout_terms TEXT DEFAULT '',
  monthly_display_fee_gbp NUMERIC,

  condition_in TEXT DEFAULT '',
  condition_out TEXT DEFAULT '',
  damage_notes TEXT DEFAULT '',

  location_in_venue TEXT DEFAULT '',
  piece_count INTEGER DEFAULT 1,

  delivered_by TEXT DEFAULT '',
  collection_responsible TEXT DEFAULT '',

  exclusive_to_venue BOOLEAN DEFAULT FALSE,
  available_for_sale BOOLEAN DEFAULT TRUE,

  logistics_notes TEXT DEFAULT '',
  contract_attachment_url TEXT DEFAULT '',
  internal_notes TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_placement_records_placement_id ON placement_records(placement_id);
CREATE INDEX IF NOT EXISTS idx_placement_records_artist ON placement_records(artist_user_id);
CREATE INDEX IF NOT EXISTS idx_placement_records_venue ON placement_records(venue_user_id);

ALTER TABLE placement_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "placement_records_select_parties" ON placement_records
    FOR SELECT USING (auth.uid() = artist_user_id OR auth.uid() = venue_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "placement_records_update_parties" ON placement_records
    FOR UPDATE USING (auth.uid() = artist_user_id OR auth.uid() = venue_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Inserts go through the service role (server-side only) to enforce that
-- the row matches the placement's parties, so no authenticated INSERT policy.

-- ---------- Placement photos ----------
CREATE TABLE IF NOT EXISTS placement_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id TEXT NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  uploader_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_placement_photos_placement ON placement_photos(placement_id);

ALTER TABLE placement_photos ENABLE ROW LEVEL SECURITY;

-- Either party of the placement can see/delete photos for that placement
DO $$ BEGIN
  CREATE POLICY "placement_photos_select_parties" ON placement_photos
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM placements p
        WHERE p.id = placement_photos.placement_id
          AND (auth.uid() = p.artist_user_id OR auth.uid() = p.venue_user_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "placement_photos_delete_uploader" ON placement_photos
    FOR DELETE USING (auth.uid() = uploader_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Note: create a "placements" Supabase Storage bucket in the project dashboard
-- with public-read enabled; the upload helper writes to {user_id}/{ts}-{rand}.ext.
