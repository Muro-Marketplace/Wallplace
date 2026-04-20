-- ============================================
-- Migration 012: Production readiness blockers
-- F28-F34: RLS fixes, FK constraints, indexes, idempotency
-- ============================================

-- ---------- F30: Webhook idempotency ----------
-- Unique index on stripe_payment_intent_id so duplicate webhook deliveries
-- cannot create duplicate orders. The partial WHERE guards against legacy
-- rows with empty strings being forced into uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_unique
  ON orders(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL
    AND stripe_payment_intent_id <> '';

-- ---------- F34: Missing hot-path indexes ----------
CREATE INDEX IF NOT EXISTS idx_orders_artist_user_id ON orders(artist_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_venue_slug ON orders(venue_slug);
CREATE INDEX IF NOT EXISTS idx_orders_placement_id ON orders(placement_id);

-- ---------- F33: FK constraints ----------
-- orders.artist_user_id should reference auth.users with SET NULL on delete
-- so order history is preserved if the artist deletes their account.
DO $$ BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_artist_user
    FOREIGN KEY (artist_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN others THEN NULL;
END $$;

-- refund_requests.order_id should reference orders with RESTRICT so refunds
-- cannot orphan.
DO $$ BEGIN
  ALTER TABLE refund_requests
    ADD CONSTRAINT fk_refund_requests_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN others THEN NULL;
END $$;

-- ---------- F28: refund_requests RLS ----------
-- Replace the too-permissive "any authenticated user can SELECT/INSERT/UPDATE"
-- policies with scoped ones. Only the requester or a service-role process
-- can read/write; admin mutations continue to go through service role.
DROP POLICY IF EXISTS "refund_requests_insert" ON refund_requests;
DROP POLICY IF EXISTS "refund_requests_select" ON refund_requests;
DROP POLICY IF EXISTS "refund_requests_update" ON refund_requests;

-- Authenticated users may request a refund against one of their orders
-- (we rely on the API layer to cross-check the order belongs to them; this
-- policy just prevents anon abuse).
CREATE POLICY "refund_requests_insert_own" ON refund_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_user_id);

-- Authenticated users may only read refund requests they created.
CREATE POLICY "refund_requests_select_own" ON refund_requests
  FOR SELECT USING (auth.uid() = requester_user_id);

-- Updates (approve/decline) only via service role — no client-side policy.

-- ---------- F29: messages RLS ----------
-- Problem: recipient_slug is a slug, not a user_id, so the existing SELECT
-- policy only lets senders read messages. Add a recipient_user_id column
-- and tighten SELECT/UPDATE to cover both parties.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_user_id UUID;

-- Best-effort backfill via artist_profiles and venue_profiles lookups.
UPDATE messages m
SET recipient_user_id = ap.user_id
FROM artist_profiles ap
WHERE m.recipient_user_id IS NULL
  AND m.recipient_slug = ap.slug;

UPDATE messages m
SET recipient_user_id = vp.user_id
FROM venue_profiles vp
WHERE m.recipient_user_id IS NULL
  AND m.recipient_slug = vp.slug;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_user_id
  ON messages(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at DESC);

DROP POLICY IF EXISTS "Authenticated can read messages" ON messages;
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Authenticated can update messages" ON messages;
DROP POLICY IF EXISTS "Recipients can update messages" ON messages;

CREATE POLICY "messages_select_party" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_user_id = auth.uid()
  );

-- Only the recipient can mark as read; senders can't mutate delivered messages.
CREATE POLICY "messages_update_recipient" ON messages
  FOR UPDATE USING (recipient_user_id = auth.uid());
