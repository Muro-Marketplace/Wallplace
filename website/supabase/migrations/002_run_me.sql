-- ============================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- Safe to run multiple times (all statements use IF NOT EXISTS)
-- ============================================================

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  artist_slug text,
  work_title text,
  visitor_id text,
  referrer text,
  user_agent text,
  ip_hash text,
  venue_name text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_artist ON analytics_events(artist_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_venue ON analytics_events(venue_name) WHERE venue_name IS NOT NULL;

-- Featured artists table
CREATE TABLE IF NOT EXISTS featured_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_slug text NOT NULL,
  featured_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Artist referrals table
CREATE TABLE IF NOT EXISTS artist_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_slug text NOT NULL,
  referred_email text,
  referred_slug text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Artist profile stat columns
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS total_views integer DEFAULT 0;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS total_enquiries integer DEFAULT 0;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS total_placements integer DEFAULT 0;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS total_sales integer DEFAULT 0;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS email_digest_enabled boolean DEFAULT true;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamptz;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS message_notifications_enabled boolean DEFAULT true;

-- Venue profile notification column
ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS message_notifications_enabled boolean DEFAULT true;

-- Placement request/accept columns
ALTER TABLE placements ADD COLUMN IF NOT EXISTS venue_user_id uuid;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS venue_slug text;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS artist_slug text;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS message text;
CREATE INDEX IF NOT EXISTS idx_placements_venue_user ON placements(venue_user_id) WHERE venue_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_placements_status ON placements(status);

-- Message types for placement requests in conversations
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
