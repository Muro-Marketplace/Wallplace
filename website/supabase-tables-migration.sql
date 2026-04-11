-- Missing tables migration
-- Run this in Supabase SQL Editor

-- 1. Waitlist signups
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert waitlist" ON waitlist_signups FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can read waitlist" ON waitlist_signups FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Contact submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contact" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can read contact" ON contact_submissions FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Enquiries
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  artist_slug TEXT NOT NULL,
  work_title TEXT,
  enquiry_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert enquiry" ON enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can read enquiries" ON enquiries FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  buyer_email TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  shipping JSONB DEFAULT '{}',
  subtotal NUMERIC DEFAULT 0,
  shipping_cost NUMERIC,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can read orders" ON orders FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  sender_type TEXT DEFAULT 'anonymous',
  recipient_slug TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can insert messages" ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can read messages" ON messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update messages" ON messages FOR UPDATE USING (auth.role() = 'authenticated');

-- 6. Placements
CREATE TABLE IF NOT EXISTS placements (
  id TEXT PRIMARY KEY,
  artist_user_id UUID REFERENCES auth.users(id),
  work_title TEXT NOT NULL,
  work_image TEXT,
  venue TEXT NOT NULL,
  arrangement_type TEXT NOT NULL,
  revenue_share_percent NUMERIC,
  status TEXT DEFAULT 'active',
  revenue NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can insert placements" ON placements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owner can read placements" ON placements FOR SELECT USING (auth.uid() = artist_user_id);
CREATE POLICY "Owner can update placements" ON placements FOR UPDATE USING (auth.uid() = artist_user_id);
CREATE POLICY "Owner can delete placements" ON placements FOR DELETE USING (auth.uid() = artist_user_id);

-- 7. Venue registrations
CREATE TABLE IF NOT EXISTS venue_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name TEXT NOT NULL,
  venue_type TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  wall_space TEXT,
  art_interests JSONB DEFAULT '[]',
  message TEXT,
  hear_about TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE venue_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert venue reg" ON venue_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can read venue reg" ON venue_registrations FOR SELECT USING (auth.role() = 'authenticated');
