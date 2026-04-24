-- Capture the trader-status sign-up answer so the admin CRM can filter
-- by individual vs business and so the legal /14-day-cancel routing has
-- a persisted source of truth, not just the form submission.
ALTER TABLE artist_applications
  ADD COLUMN IF NOT EXISTS trader_status TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT;
