-- 039_stripe_transfers_payout_after.sql
--
-- Reconciles a code-vs-schema gap: src/lib/stripe-connect.ts has been
-- writing a `payout_after` timestamp to stripe_transfers since the
-- payout-delay flow landed, but the column was never created. Every
-- scheduleTransfer() call after a sale would have silently failed with
-- 'column "payout_after" does not exist'. Sandbox never tripped this
-- because no artist has yet completed Connect onboarding, but it
-- would have blocked the entire payout flow on the first live sale
-- with a connected artist.
--
-- Adds the column, back-fills any existing rows from created_at + 14d
-- (matches the value scheduleTransfer would have written), and adds a
-- partial index for the processPendingTransfers cron query.

ALTER TABLE stripe_transfers
  ADD COLUMN IF NOT EXISTS payout_after TIMESTAMPTZ;

UPDATE stripe_transfers
SET payout_after = created_at + INTERVAL '14 days'
WHERE payout_after IS NULL AND created_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_transfers_pending_payout
  ON stripe_transfers(payout_after)
  WHERE status = 'pending';
