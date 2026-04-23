-- 024_placements_bilateral_confirmation.sql
--
-- Bilateral confirmation for critical placement milestones (install, collection).
-- When one side marks a milestone, the timestamp stays NULL and the stage is
-- recorded in `proposed_stage` with who proposed it. The counterparty gets a
-- "Confirm" button in their portal. Once they confirm, the relevant timestamp
-- (installed_at / collected_at) is set and proposed_stage clears.
--
-- This prevents either side from unilaterally moving a placement forward and
-- gives both parties an audit trail. scheduled_for and live_from remain
-- single-sided (scheduling is conversational; "live" kicks in automatically
-- once the install is confirmed and the scheduled date passes).

ALTER TABLE placements
  ADD COLUMN IF NOT EXISTS proposed_stage TEXT
    CHECK (proposed_stage IN ('installed', 'collected') OR proposed_stage IS NULL),
  ADD COLUMN IF NOT EXISTS proposed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
