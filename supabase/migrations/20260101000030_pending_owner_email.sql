-- Allow admins to pre-assign an owner email before the person signs up.
-- On signup, the app checks for matching pending_owner_email and auto-claims.
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_owner_email TEXT;
CREATE INDEX IF NOT EXISTS idx_providers_pending_owner_email ON providers (pending_owner_email) WHERE pending_owner_email IS NOT NULL;
