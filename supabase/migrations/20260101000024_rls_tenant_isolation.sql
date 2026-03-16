-- ══════════════════════════════════════════════════════════════════════════════
-- RLS TENANT ISOLATION — SELECT POLICY HARDENING
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- PROBLEM: The original SELECT policies (migration 009) have no tenant_id
-- filter, so a direct REST API call with the anon key returns data from ALL
-- counties, bypassing the app-layer tenant filter.
--
-- SOLUTION: Drop and recreate each public SELECT policy to include
-- AND tenant_id = ANY(ARRAY[...known tenants...])
--
-- BEFORE LAUNCHING COUNTY #2: Add the new tenant ID to every
-- ALLOWED_TENANT_IDS array below, then re-run this migration.
--
-- LONG-TERM: Replace the hardcoded IN-list with a JWT custom claim
-- (set tenant_id in Supabase Auth → Hooks → Custom JWT) and use:
--   auth.jwt() ->> 'tenant_id'
-- in each policy.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── providers ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "public read approved providers" ON providers;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read approved providers"
    ON providers FOR SELECT
    USING (
      status = 'approved'
      AND tenant_id = ANY(ARRAY['grayson'])  -- add new county IDs here
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── reviews ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "public read reviews" ON reviews;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read reviews"
    ON reviews FOR SELECT
    USING (
      tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── lost_found_posts ──────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "public read active lost found" ON lost_found_posts;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read active lost found"
    ON lost_found_posts FOR SELECT
    USING (
      status = 'active'
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── recommendation_requests ───────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "public read open requests" ON recommendation_requests;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read open requests"
    ON recommendation_requests FOR SELECT
    USING (
      status = 'open'
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner read own requests" ON recommendation_requests;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner read own requests"
    ON recommendation_requests FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── recommendation_responses ──────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "public read responses" ON recommendation_responses;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read responses"
    ON recommendation_responses FOR SELECT
    USING (
      tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── review_replies ────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "public read review replies" ON review_replies;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read review replies"
    ON review_replies FOR SELECT
    USING (
      tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── community_events ──────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "public read approved events" ON community_events;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read approved events"
    ON community_events FOR SELECT
    USING (
      status = 'approved'
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── community_alerts ──────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "public read active alerts" ON community_alerts;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read active alerts"
    ON community_alerts FOR SELECT
    USING (
      dismissed_at IS NULL
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── listing_views ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "anyone read views" ON listing_views;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anyone read views"
    ON listing_views FOR SELECT
    USING (
      tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- Done.
-- Verify isolation with:
--   SELECT DISTINCT tenant_id FROM providers;
--   SELECT DISTINCT tenant_id FROM reviews;
-- Each should only return the tenants in the ARRAY above.
-- ══════════════════════════════════════════════════════════════════════════════
