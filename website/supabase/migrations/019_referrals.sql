-- Item 25: simple affiliate / referral scheme.
-- Each artist gets a unique 6-char referral code on profile creation.
-- A new artist can enter a referral code on signup → stored as referred_by_code.
-- When that artist first transitions to a paid plan (Stripe webhook), the
-- referrer's free_until gets extended by 30 days. Credit is recorded via
-- referral_credited_at so it only pays out once per referee.

ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS referral_credited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_artist_profiles_referred_by_code
  ON artist_profiles(referred_by_code)
  WHERE referred_by_code IS NOT NULL;

-- Generate codes for existing rows that don't have one yet.
-- 6 uppercase alphanumeric chars — ~2bn combinations; collision unlikely.
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
BEGIN
  FOR r IN SELECT id FROM artist_profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := upper(substring(md5(random()::text) from 1 for 6));
      BEGIN
        UPDATE artist_profiles SET referral_code = new_code WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Collided with another code — try again.
        NULL;
      END;
    END LOOP;
  END LOOP;
END $$;
