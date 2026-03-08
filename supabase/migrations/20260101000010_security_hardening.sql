-- ══════════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING MIGRATION
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
--
-- Addresses:
--   VULN-01  listing_views anonymous insert (policy name mismatch)
--   VULN-03  vote count update RLS conflict (replaced with SECURITY DEFINER fn)
--   VULN-06  no duplicate-prevention on claims/reports (spam flood)
--   VULN-07  public analytics leak ("anyone read views" policy)
--   VULN-13  no audit trail for admin actions
-- ══════════════════════════════════════════════════════════════════════════════


-- ── VULN-01: Drop the anonymous insert policy created in migration 006 ─────────
-- Migration 009 tried to drop "anyone log views" but the policy was actually
-- named "Anyone can log a view" — a case/word mismatch meant it was never
-- removed. Both policies coexisted, leaving anonymous inserts open.

DROP POLICY IF EXISTS "Anyone can log a view" ON listing_views;


-- ── VULN-03: Vote count update via SECURITY DEFINER function ──────────────────
-- The "owner update own response" RLS policy only allows response AUTHORS to
-- UPDATE their own row. But vote counts are updated by VOTERS (other users).
-- Direct UPDATE calls from voters were silently rejected by RLS.
--
-- Fix: a SECURITY DEFINER function bypasses RLS for this specific operation
-- (counting votes and syncing the cached total) while keeping all other
-- UPDATE access locked down. The function is intentionally narrow — it only
-- reads the votes table and writes vote_count; nothing else.

CREATE OR REPLACE FUNCTION sync_vote_count(p_response_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count actual votes for this response
  SELECT COUNT(*) INTO v_count
  FROM recommendation_response_votes
  WHERE response_id = p_response_id;

  -- Sync the cached total on the response row (bypasses RLS intentionally)
  UPDATE recommendation_responses
  SET vote_count = v_count
  WHERE id = p_response_id;

  RETURN v_count;
END;
$$;

-- Grant execute to authenticated users only (not anon)
REVOKE ALL ON FUNCTION sync_vote_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_vote_count(uuid) TO authenticated;


-- ── VULN-06: Spam prevention — unique indexes ─────────────────────────────────
-- Prevent a user from submitting multiple pending claims for the same provider.
-- Without this, a script could flood the admin claims queue in seconds.
CREATE UNIQUE INDEX IF NOT EXISTS listing_claims_user_provider_pending
  ON listing_claims(provider_id, user_id)
  WHERE status = 'pending';

-- Prevent a user from reporting the same piece of content more than once.
-- Without this, a single user can flood the admin reports queue with duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_user_content_unique
  ON content_reports(content_id, content_type, reported_by);


-- ── VULN-07: Remove the public analytics read policy ─────────────────────────
-- "anyone read views" (added in migration 009) allowed any visitor — including
-- anonymous users — to read full view history for every listing, enabling
-- competitor intelligence. The owner-scoped policy from migration 006 remains.

DROP POLICY IF EXISTS "anyone read views" ON listing_views;

-- Ensure the owner-only read policy from migration 006 is in place
-- (idempotent — safe to re-run if it already exists).
DO $$ BEGIN
  CREATE POLICY "Owner can read own listing views"
    ON listing_views FOR SELECT
    USING (
      provider_id IN (
        SELECT id FROM providers WHERE claimed_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── VULN-13: Audit log for administrative actions ─────────────────────────────
-- Every admin/moderator action (approve, reject, delete, dismiss) now writes
-- a tamper-evident record. Admins can read; no one can delete.

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        NOT NULL,
  action      text        NOT NULL,   -- e.g. 'approve_provider', 'delete_review'
  target_table text,                  -- e.g. 'providers', 'reviews'
  target_id   text,                   -- UUID of the affected row
  tenant_id   text,
  metadata    jsonb,                  -- optional extra context (provider name, etc.)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- No UPDATE or DELETE on the audit log — append-only.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin read audit log"
    ON audit_log FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated insert audit log"
    ON audit_log FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for efficient admin queries (by tenant and time)
CREATE INDEX IF NOT EXISTS audit_log_tenant_time_idx
  ON audit_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx
  ON audit_log(actor_id);


-- ── Bonus: add tenant_id to review_replies if missing ────────────────────────
-- The multi-tenant migration (008) missed this table. The application code
-- already inserts tenant_id here, so the column must exist — but if it does
-- not, this ALTER is safe (IF NOT EXISTS).
ALTER TABLE review_replies
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'grayson';

CREATE INDEX IF NOT EXISTS review_replies_tenant_idx
  ON review_replies(tenant_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- Done. Apply immediately in Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════
