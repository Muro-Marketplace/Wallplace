-- ============================================
-- Migration 005: Artist Collections
-- Persist artist-created collections with thumbnail + banner images
-- ============================================

-- 1. artist_collections table
CREATE TABLE IF NOT EXISTS artist_collections (
  id TEXT PRIMARY KEY,
  artist_id UUID NOT NULL,
  artist_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  bundle_price NUMERIC,
  work_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail TEXT,
  banner_image TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_collections_artist_id ON artist_collections(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_collections_artist_slug ON artist_collections(artist_slug);
CREATE INDEX IF NOT EXISTS idx_artist_collections_available ON artist_collections(available);

-- Idempotent add in case the table existed without image columns
ALTER TABLE artist_collections ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE artist_collections ADD COLUMN IF NOT EXISTS banner_image TEXT;
ALTER TABLE artist_collections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. RLS policies
ALTER TABLE artist_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collections_public_read" ON artist_collections;
CREATE POLICY "collections_public_read" ON artist_collections
  FOR SELECT USING (available = true);

DROP POLICY IF EXISTS "collections_owner_all" ON artist_collections;
CREATE POLICY "collections_owner_all" ON artist_collections
  FOR ALL USING (
    artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
  );

-- 3. Storage bucket for collection images (thumbnails + banners)
-- Reuses the existing 'artworks' bucket pattern but isolates collection assets.
INSERT INTO storage.buckets (id, name, public)
VALUES ('collections', 'collections', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on collection images
DROP POLICY IF EXISTS "collections_storage_public_read" ON storage.objects;
CREATE POLICY "collections_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'collections');

-- Authenticated users can upload to their own folder (prefix = user.id)
DROP POLICY IF EXISTS "collections_storage_owner_insert" ON storage.objects;
CREATE POLICY "collections_storage_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'collections'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "collections_storage_owner_update" ON storage.objects;
CREATE POLICY "collections_storage_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'collections'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "collections_storage_owner_delete" ON storage.objects;
CREATE POLICY "collections_storage_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'collections'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
