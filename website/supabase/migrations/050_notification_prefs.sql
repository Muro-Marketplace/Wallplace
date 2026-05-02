-- 050_notification_prefs.sql
--
-- Backfill notification-preference columns for customers (artists +
-- venues already have email_digest_enabled / message_notifications_enabled
-- as of migration 001). All preferences default to opt-in (true).
--
-- This migration is idempotent: ADD COLUMN IF NOT EXISTS makes it safe
-- to re-run, and the new columns mirror existing semantics on the other
-- two profile tables.
--
-- customer_profiles already exists (created in 001_analytics_events.sql),
-- so we just add the three preference columns. Artists/venues need
-- order_notifications_enabled and email_digest_enabled (venues only)
-- to round out the matrix.

ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS email_digest_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS message_notifications_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_notifications_enabled boolean DEFAULT true;

ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS order_notifications_enabled boolean DEFAULT true;

ALTER TABLE venue_profiles
  ADD COLUMN IF NOT EXISTS email_digest_enabled boolean DEFAULT true;
