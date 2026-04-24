-- Per-message pin + soft-delete. Soft-delete means the row stays so the
-- other party isn't gaslit by missing context, but it renders as "deleted"
-- to everyone. Pins surface the message at the top of the thread.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_messages_pinned_at ON messages(conversation_id, pinned_at DESC NULLS LAST);
