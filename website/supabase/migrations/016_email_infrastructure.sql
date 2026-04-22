-- Email infrastructure: logging, preferences, suppressions, idempotency.
-- Stream values: 'tx' (transactional critical), 'notify' (relational), 'news' (marketing).

-- Every send attempt is logged here. Powers retry safety, debugging, and analytics.
CREATE TABLE IF NOT EXISTS email_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key text UNIQUE NOT NULL,
  user_id uuid,
  to_email text NOT NULL,
  template text NOT NULL,
  stream text NOT NULL DEFAULT 'notify',
  subject text,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  provider text DEFAULT 'resend',
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ee_user ON email_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ee_to ON email_events(to_email);
CREATE INDEX IF NOT EXISTS idx_ee_template ON email_events(template);
CREATE INDEX IF NOT EXISTS idx_ee_created_at ON email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ee_status ON email_events(status);
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Per-user category preferences. One row per user. Defaults applied in sendEmail().
CREATE TABLE IF NOT EXISTS email_preferences (
  user_id uuid PRIMARY KEY,
  -- Critical streams are NOT user-controlled:
  --   security (verify, reset, breach), legal (ToS, privacy, tax), orders_and_payouts.
  -- Everything below can be toggled by the user.
  placements_enabled boolean NOT NULL DEFAULT true,
  messages_enabled boolean NOT NULL DEFAULT true,
  digests_enabled boolean NOT NULL DEFAULT true,
  recommendations_enabled boolean NOT NULL DEFAULT true,
  tips_enabled boolean NOT NULL DEFAULT true,
  newsletter_enabled boolean NOT NULL DEFAULT false, -- double opt-in
  promotions_enabled boolean NOT NULL DEFAULT false, -- must opt in
  digest_frequency text NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('daily','weekly','off')),
  vacation_until timestamptz,                         -- master pause for non-critical
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Permanent/semi-permanent blocks. Scope='all' blocks everything except password reset;
-- scope='marketing' blocks news stream only; scope='notify' blocks relational + news.
CREATE TABLE IF NOT EXISTS email_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL CHECK (reason IN ('hard_bounce','soft_bounce','complaint','unsubscribe','manual','invalid')),
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','marketing','notify','security_only')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

-- Short-lived idempotency lookup. sendEmail() checks here before sending.
-- email_events.idempotency_key is the source of truth; this is a fast-path cache.
-- (Kept as a separate concept so we can evict old keys without losing history.)

-- Useful view: recent sends per user, for throttle checks.
CREATE OR REPLACE VIEW email_recent_sends AS
SELECT user_id, template, stream, created_at
FROM email_events
WHERE created_at > now() - interval '72 hours'
  AND status IN ('sent','queued');

-- Helper: get-or-create preferences row with defaults.
CREATE OR REPLACE FUNCTION get_email_preferences(p_user_id uuid)
RETURNS email_preferences
LANGUAGE plpgsql
AS $$
DECLARE
  p email_preferences;
BEGIN
  SELECT * INTO p FROM email_preferences WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO email_preferences (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO p;
    IF p IS NULL THEN
      SELECT * INTO p FROM email_preferences WHERE user_id = p_user_id;
    END IF;
  END IF;
  RETURN p;
END;
$$;
