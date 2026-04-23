-- 025_placements_stripe_subscription.sql
--
-- Track the monthly subscription for paid-loan placements. One placement ↔
-- one subscription. Lets the venue-portal surface "Active £X/mo", "Cancelled",
-- "Past due" state inline against each placement without re-hitting Stripe.

ALTER TABLE placements
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing') OR subscription_status IS NULL),
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_placements_stripe_subscription_id
  ON placements (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
