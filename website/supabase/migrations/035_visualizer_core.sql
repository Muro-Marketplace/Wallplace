-- ============================================
-- Migration 035: Wall Visualizer — core data model (Phase 1 / MVP)
-- ============================================
--
-- Context:
-- The Wall Visualizer is a customer/venue/artist tool for placing artworks
-- on walls digitally. See website/docs/products/WALL_VISUALIZER.md for the
-- full spec. This migration introduces the persistent data model behind it.
--
-- Tables introduced:
--   walls                       Saved wall (preset config or uploaded photo)
--   wall_layouts                A specific arrangement of works on a wall
--   wall_renders                Composite output images produced from a layout
--   visualizer_usage            Append-only quota ledger (consume + refund)
--   visualizer_quota_overrides  Support tool for per-user grants
--
-- Existing table touched:
--   artist_works.mockups        JSONB[] of saved mockups attached to a work
--                               (so artists can add visualizer renders to
--                                their listings without a join table)
--
-- Coordinate system:
--   Layout items store positions in CENTIMETRES, not pixels. Conversions
--   happen at the canvas + render layer. This makes layouts resolution-
--   independent and lets us re-render at any size in future.
--
-- RLS strategy (matches migration 034):
--   - Enable RLS on every new table.
--   - SELECT policies for the rows the owner legitimately needs.
--   - No client-side INSERT/UPDATE/DELETE policies — all mutations happen
--     via service-role API routes (/api/walls/*).
--   - artist_showrooms (deferred to Phase 3) is NOT created here. We add
--     it in a later migration when that phase ships.
--
-- Deployment notes:
--   - Safe to run on production with no data: all tables are new + the
--     ALTER on artist_works adds a nullable JSONB with a default.
--   - The required Supabase Storage buckets (`wall-photos`, `wall-renders`)
--     must be created in the dashboard separately. They are not part of
--     this migration since Storage buckets aren't in core SQL.
--
-- Rollback:
--   To roll back (UNSAFE — destroys saved walls/layouts/renders):
--     DROP TABLE IF EXISTS visualizer_quota_overrides;
--     DROP TABLE IF EXISTS visualizer_usage;
--     DROP TABLE IF EXISTS wall_renders;
--     DROP TABLE IF EXISTS wall_layouts;
--     DROP TABLE IF EXISTS walls;
--     ALTER TABLE artist_works DROP COLUMN IF EXISTS mockups;

-- ---------- walls ----------
-- A saved wall. Either a preset config (kind='preset') or an uploaded photo
-- (kind='uploaded'). Owner is the auth user; owner_type clarifies which
-- portal/persona they're acting in (a single user account can be both an
-- artist and a venue contact, so we record intent at create time).
CREATE TABLE IF NOT EXISTS walls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('venue', 'artist', 'customer')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  kind TEXT NOT NULL CHECK (kind IN ('preset', 'uploaded')),

  -- When kind = 'preset': identifies which stock wall (e.g. 'cafe_back_wall').
  preset_id TEXT,

  -- When kind = 'uploaded': Supabase Storage path to the original photo.
  source_image_path TEXT,

  -- Wall dimensions in centimetres. Bounded between 50cm and 1000cm to
  -- catch fat-finger metres-vs-cm mistakes early.
  width_cm NUMERIC(8, 2) NOT NULL CHECK (width_cm BETWEEN 50 AND 1000),
  height_cm NUMERIC(8, 2) NOT NULL CHECK (height_cm BETWEEN 50 AND 1000),

  -- Wall colour for preset walls. Hex stored without leading '#' for forward-
  -- compat with palettes (e.g. 'F5F1EB' is "warm off-white").
  wall_color_hex TEXT DEFAULT 'FFFFFF' CHECK (wall_color_hex ~ '^[0-9A-Fa-f]{6}$'),

  -- Optional perspective hint from the user tapping the four corners of
  -- the actual wall in their uploaded photo. 3x3 homography matrix encoded
  -- as a 9-element array. Phase 2+ — nullable for MVP.
  perspective_homography JSONB,

  -- Optional segmentation mask path (Phase 2+ — produced by AI on upload).
  segmentation_mask_path TEXT,

  notes TEXT CHECK (notes IS NULL OR length(notes) <= 1000),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A preset wall must declare its preset_id; an uploaded wall must declare
  -- its source_image_path. Enforced via CHECK rather than separate tables
  -- because both kinds share the same downstream mechanics.
  CHECK (
    (kind = 'preset' AND preset_id IS NOT NULL) OR
    (kind = 'uploaded' AND source_image_path IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS walls_user_idx ON walls(user_id);
CREATE INDEX IF NOT EXISTS walls_user_owner_type_idx ON walls(user_id, owner_type);

-- updated_at trigger
CREATE OR REPLACE FUNCTION walls_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS walls_updated_at ON walls;
CREATE TRIGGER walls_updated_at BEFORE UPDATE ON walls
  FOR EACH ROW EXECUTE FUNCTION walls_set_updated_at();

-- ---------- wall_layouts ----------
-- A layout is a specific arrangement of works on a wall. A wall can have
-- multiple layouts (e.g. "summer rotation", "winter rotation").
--
-- items is a JSONB array of WallItem objects. Schema validated at the
-- application layer (see src/lib/visualizer/validations.ts). We keep it
-- as JSONB rather than a child table because:
--   - items are always read together (one round-trip per layout)
--   - we never query "which works are on which layout" globally
--   - reordering is a single jsonb assignment, no cascading inserts
CREATE TABLE IF NOT EXISTS wall_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wall_id UUID NOT NULL REFERENCES walls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- sha256 of (items + wall config) — used for the render cache. If the
  -- layout hasn't changed since the last render, hitting "Generate" again
  -- returns the cached image without consuming quota.
  layout_hash TEXT,

  -- Soft FK to the most recent successful render. Not a hard FK so deleting
  -- old renders doesn't cascade-null layouts in unexpected ways.
  last_render_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wall_layouts_wall_idx ON wall_layouts(wall_id);
CREATE INDEX IF NOT EXISTS wall_layouts_user_idx ON wall_layouts(user_id);
CREATE INDEX IF NOT EXISTS wall_layouts_hash_idx ON wall_layouts(layout_hash);

CREATE OR REPLACE FUNCTION wall_layouts_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wall_layouts_updated_at ON wall_layouts;
CREATE TRIGGER wall_layouts_updated_at BEFORE UPDATE ON wall_layouts
  FOR EACH ROW EXECUTE FUNCTION wall_layouts_set_updated_at();

-- ---------- wall_renders ----------
-- A composite output produced from a layout. Storage path points to a
-- public-readable, signed-write bucket. cost_units captures what the
-- render charged the user (1 standard, 2 HD, etc).
--
-- kept = true exempts the render from the 90-day cleanup. Set to true
-- automatically when an artist saves a render as an artwork mockup.
CREATE TABLE IF NOT EXISTS wall_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID REFERENCES wall_layouts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('standard', 'hd', 'showroom')),
  output_path TEXT NOT NULL,
  layout_hash TEXT NOT NULL,
  cost_units INT NOT NULL DEFAULT 1 CHECK (cost_units BETWEEN 1 AND 10),
  kept BOOLEAN NOT NULL DEFAULT false,

  -- Provider metadata: which AI engine (if any) was used, plus any prompt
  -- seed for reproducibility. Null for MVP non-AI renders.
  provider TEXT,
  prompt_seed JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wall_renders_user_idx ON wall_renders(user_id);
CREATE INDEX IF NOT EXISTS wall_renders_hash_idx ON wall_renders(layout_hash);
CREATE INDEX IF NOT EXISTS wall_renders_layout_idx ON wall_renders(layout_id);
CREATE INDEX IF NOT EXISTS wall_renders_keep_idx ON wall_renders(created_at) WHERE kept = false;

-- ---------- visualizer_usage ----------
-- Append-only quota ledger. Each row represents either a consumption
-- (cost_units > 0) or a refund (cost_units < 0). Querying remaining quota
-- is `SELECT sum(cost_units) WHERE user_id=... AND day_bucket = today`.
--
-- Why a ledger rather than a counter:
--   - Refunds are trivial (insert negative row) without race conditions.
--   - Full audit trail for support.
--   - Easy to add new bucket types (weekly, custom windows) later.
CREATE TABLE IF NOT EXISTS visualizer_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'render_standard',
    'render_hd',
    'wall_upload',
    'showroom_publish',
    'refund'
  )),
  cost_units INT NOT NULL CHECK (cost_units BETWEEN -10 AND 10),

  -- Day in UTC ('YYYY-MM-DD'). We use UTC consistently — quota resets at
  -- 00:00 GMT regardless of user timezone (matches the spec).
  day_bucket DATE NOT NULL,
  -- Month as 'YYYY-MM' for cheap monthly aggregates without date_trunc.
  month_bucket TEXT NOT NULL CHECK (month_bucket ~ '^[0-9]{4}-[0-9]{2}$'),

  -- Optional reference to the thing that produced this row (render id,
  -- wall id, etc) — useful for support but not enforced via FK.
  reference_id UUID,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vis_usage_user_day_idx ON visualizer_usage(user_id, day_bucket);
CREATE INDEX IF NOT EXISTS vis_usage_user_month_idx ON visualizer_usage(user_id, month_bucket);

-- ---------- visualizer_quota_overrides ----------
-- Support tool: grant a specific user extra daily/monthly quota. Used to
-- handle exception cases (a Pro artist demoing to a client; a venue we want
-- to comp; a power user we want to keep happy). Expires_at lets us hand out
-- temporary boosts without forgetting to revoke them.
CREATE TABLE IF NOT EXISTS visualizer_quota_overrides (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_extra INT NOT NULL DEFAULT 0 CHECK (daily_extra BETWEEN 0 AND 1000),
  monthly_extra INT NOT NULL DEFAULT 0 CHECK (monthly_extra BETWEEN 0 AND 10000),
  expires_at TIMESTAMPTZ,
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 500),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- artist_works.mockups ----------
-- Saved visualizer renders attached to a work. Each entry:
--   { render_id, url, layout_id, wall_name, created_at }
-- See src/lib/visualizer/types.ts for the canonical shape.
ALTER TABLE artist_works
  ADD COLUMN IF NOT EXISTS mockups JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ============================================
-- RLS (matches the strategy in migration 034)
-- ============================================

-- ---------- walls ----------
ALTER TABLE walls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "walls_select_own" ON walls;
CREATE POLICY "walls_select_own" ON walls
  FOR SELECT USING (auth.uid() = user_id);

-- No client-side INSERT/UPDATE/DELETE policies. /api/walls/* mutates via
-- service role.

-- ---------- wall_layouts ----------
ALTER TABLE wall_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wall_layouts_select_own" ON wall_layouts;
CREATE POLICY "wall_layouts_select_own" ON wall_layouts
  FOR SELECT USING (auth.uid() = user_id);

-- ---------- wall_renders ----------
ALTER TABLE wall_renders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wall_renders_select_own" ON wall_renders;
CREATE POLICY "wall_renders_select_own" ON wall_renders
  FOR SELECT USING (auth.uid() = user_id);

-- ---------- visualizer_usage ----------
ALTER TABLE visualizer_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage rows (so the UI can show "5 of 10 used").
DROP POLICY IF EXISTS "visualizer_usage_select_own" ON visualizer_usage;
CREATE POLICY "visualizer_usage_select_own" ON visualizer_usage
  FOR SELECT USING (auth.uid() = user_id);

-- ---------- visualizer_quota_overrides ----------
ALTER TABLE visualizer_quota_overrides ENABLE ROW LEVEL SECURITY;

-- No SELECT policy — overrides are an admin-only concept. The quota service
-- reads them via the service-role client. Default deny is correct.

-- ============================================
-- Post-flight notes
-- ============================================
--
-- After applying:
--
-- 1. In Supabase dashboard, create the Storage buckets if not already there:
--      wall-photos     (private,   used for uploaded wall photos)
--      wall-renders    (public,    used for composite output images)
--
-- 2. Sanity check RLS as the anon role:
--      SET LOCAL ROLE anon;
--      SELECT count(*) FROM walls;          -- should be 0
--      SELECT count(*) FROM wall_layouts;   -- should be 0
--      SELECT count(*) FROM wall_renders;   -- should be 0
--      SELECT count(*) FROM visualizer_usage; -- should be 0
--      RESET ROLE;
--
-- 3. Verify the artist_works.mockups column was added:
--      SELECT column_name, data_type, column_default
--      FROM information_schema.columns
--      WHERE table_name = 'artist_works' AND column_name = 'mockups';
