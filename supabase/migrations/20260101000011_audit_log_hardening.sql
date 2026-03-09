-- ══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG HARDENING
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Problem: the previous INSERT policy allowed ANY authenticated user to write
-- arbitrary rows to the audit_log table (only checking actor_id = auth.uid()).
-- This lets a regular user fabricate admin action records, poisoning the audit
-- trail and making forensic investigation unreliable.
--
-- Fix: restrict INSERT to admin and moderator roles only, matching the roles
-- that actually call audit_log inserts in the application code.
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop all pre-existing INSERT policies (two were found in the live DB)
DROP POLICY IF EXISTS "authenticated insert audit log" ON audit_log;
DROP POLICY IF EXISTS "mod or admin insert audit log" ON audit_log;

-- Replace with a role-restricted policy
DO $$ BEGIN
  CREATE POLICY "admin insert audit log"
    ON audit_log FOR INSERT TO authenticated
    WITH CHECK (
      actor_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'moderator')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- Verify after running:
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE tablename = 'audit_log';
--
-- You should see exactly two policies:
--   "admin read audit log"   FOR SELECT
--   "admin insert audit log" FOR INSERT
-- No UPDATE, no DELETE, no policy for anon or regular authenticated users.
-- ══════════════════════════════════════════════════════════════════════════════
