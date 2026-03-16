-- ══════════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING 2 — Audit Remediation
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Fixes:
--   VULN-A  Owner can overwrite status/listing_tier/claim_status via direct API
--   VULN-B  INSERT RLS policies accept any tenant_id (cross-tenant pollution)
--   VULN-C  review_replies INSERT doesn't verify actual provider ownership
-- ══════════════════════════════════════════════════════════════════════════════


-- ── VULN-A: Block owners from changing protected provider columns ──────────────
--
-- The "owner update own listing" RLS policy allows the UPDATE but has no
-- column restrictions. A claimed owner can send a direct PATCH to the REST API
-- and set status='approved', listing_tier='featured', etc., bypassing the admin
-- review queue and the Stripe payment flow.
--
-- Fix: BEFORE UPDATE trigger that rejects any attempt by a non-admin to
-- change the protected fields. Admins and moderators are exempt.

CREATE OR REPLACE FUNCTION prevent_owner_field_overrides()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Admins and moderators may update any column — return immediately.
  -- Cast auth.uid() to text for compatibility if id column type differs.
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('admin', 'moderator')
  ) THEN
    RETURN NEW;
  END IF;

  -- Everyone else (including claimed owners) cannot change these columns:
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Permission denied: cannot change listing status.';
  END IF;
  IF NEW.listing_tier IS DISTINCT FROM OLD.listing_tier THEN
    RAISE EXCEPTION 'Permission denied: cannot change listing tier.';
  END IF;
  IF NEW.claim_status IS DISTINCT FROM OLD.claim_status THEN
    RAISE EXCEPTION 'Permission denied: cannot change claim status.';
  END IF;
  IF NEW.claimed_by IS DISTINCT FROM OLD.claimed_by THEN
    RAISE EXCEPTION 'Permission denied: cannot change claimed_by.';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Permission denied: cannot change created_by.';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Permission denied: cannot change tenant_id.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_owner_field_overrides ON providers;
CREATE TRIGGER trg_prevent_owner_field_overrides
  BEFORE UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_owner_field_overrides();


-- ── VULN-B: Add tenant_id validation to all INSERT RLS policies ───────────────
--
-- Original INSERT policies only check user_id = auth.uid(). An authenticated
-- user can bypass api.ts, call the REST API directly, and set tenant_id to any
-- arbitrary string — polluting another tenant's dataset or pre-seeding a future
-- county before it launches.
--
-- Fix: add AND tenant_id = ANY(ARRAY[...known tenants...]) to every INSERT
-- WITH CHECK, matching the same whitelist used in the SELECT policies.
-- BEFORE LAUNCHING COUNTY #2: add the new tenant ID to every array below.

-- ── reviews ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated insert reviews" ON reviews;
DO $$ BEGIN
  CREATE POLICY "authenticated insert reviews"
    ON reviews FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── lost_found_posts ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated insert lost found" ON lost_found_posts;
DO $$ BEGIN
  CREATE POLICY "authenticated insert lost found"
    ON lost_found_posts FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── recommendation_requests ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated insert requests" ON recommendation_requests;
DO $$ BEGIN
  CREATE POLICY "authenticated insert requests"
    ON recommendation_requests FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── recommendation_responses ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated insert responses" ON recommendation_responses;
DO $$ BEGIN
  CREATE POLICY "authenticated insert responses"
    ON recommendation_responses FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── community_events ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated submit event" ON community_events;
DO $$ BEGIN
  CREATE POLICY "authenticated submit event"
    ON community_events FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── listing_views ─────────────────────────────────────────────────────────────
-- Old policy was WITH CHECK (true) — no constraints at all.
DROP POLICY IF EXISTS "authenticated log views" ON listing_views;
DO $$ BEGIN
  CREATE POLICY "authenticated log views"
    ON listing_views FOR INSERT TO authenticated
    WITH CHECK (
      tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── listing_claims ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner insert own claim" ON listing_claims;
DO $$ BEGIN
  CREATE POLICY "owner insert own claim"
    ON listing_claims FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── content_reports ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated submit reports" ON content_reports;
DO $$ BEGIN
  CREATE POLICY "authenticated submit reports"
    ON content_reports FOR INSERT TO authenticated
    WITH CHECK (
      reported_by = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── providers: also block inserting with bad tenant_id ────────────────────────
DROP POLICY IF EXISTS "authenticated insert providers" ON providers;
DO $$ BEGIN
  CREATE POLICY "authenticated insert providers"
    ON providers FOR INSERT TO authenticated
    WITH CHECK (
      status = 'pending'
      AND auth.uid() IS NOT NULL
      AND tenant_id = ANY(ARRAY['grayson'])
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;


-- ── VULN-C: review_replies INSERT must verify actual provider ownership ────────
--
-- Old policy only checked owner_id = auth.uid(), which means ANY claimed owner
-- could post "Business Owner" replies on a competitor's reviews by supplying the
-- competitor's provider_id. The application-layer check (session.user.id !== ownerId)
-- only prevents ID spoofing, not cross-listing abuse.
--
-- Fix: enforce in RLS that the provider being replied to is actually claimed by
-- the calling user.

DROP POLICY IF EXISTS "owner insert review reply" ON review_replies;
DO $$ BEGIN
  CREATE POLICY "owner insert review reply"
    ON review_replies FOR INSERT TO authenticated
    WITH CHECK (
      owner_id = auth.uid()
      AND tenant_id = ANY(ARRAY['grayson'])
      AND provider_id::text IN (
        SELECT id::text FROM providers
        WHERE claimed_by::text = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- Verify after running:
--
-- 1. Trigger exists:
--    SELECT tgname FROM pg_trigger WHERE tgrelid = 'providers'::regclass;
--    → should include 'trg_prevent_owner_field_overrides'
--
-- 2. INSERT policies all have tenant_id filters:
--    SELECT tablename, policyname, with_check
--    FROM pg_policies
--    WHERE cmd = 'INSERT'
--    ORDER BY tablename;
--    → every WITH CHECK should include "tenant_id = ANY(..."
--
-- 3. review_replies INSERT requires provider ownership:
--    SELECT policyname, with_check FROM pg_policies
--    WHERE tablename = 'review_replies' AND cmd = 'INSERT';
--    → should include provider_id IN (SELECT id FROM providers WHERE claimed_by = auth.uid())
--
-- BEFORE LAUNCHING COUNTY #2:
--   Add the new tenant ID to EVERY ARRAY in this file and re-run it.
-- ══════════════════════════════════════════════════════════════════════════════
