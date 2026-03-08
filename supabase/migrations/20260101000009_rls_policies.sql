-- ══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES MIGRATION
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
--
-- Safe to run even if some tables don't exist yet — those sections are skipped.
-- Re-running is also safe — duplicate policy errors are caught and ignored.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── providers ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table providers does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read approved providers"
    ON providers FOR SELECT USING (status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin read all providers"
    ON providers FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin update providers"
    ON providers FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner update own listing"
    ON providers FOR UPDATE TO authenticated
    USING (claimed_by = auth.uid()) WITH CHECK (claimed_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin delete providers"
    ON providers FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated insert providers"
    ON providers FOR INSERT TO authenticated
    WITH CHECK (status = 'pending' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── reviews ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table reviews does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read reviews"
    ON reviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated insert reviews"
    ON reviews FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin delete reviews"
    ON reviews FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── lost_found_posts ──────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE lost_found_posts ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table lost_found_posts does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read active lost found"
    ON lost_found_posts FOR SELECT USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner read own lost found"
    ON lost_found_posts FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated insert lost found"
    ON lost_found_posts FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner update own lost found"
    ON lost_found_posts FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner or admin delete lost found"
    ON lost_found_posts FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── recommendation_requests ───────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE recommendation_requests ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table recommendation_requests does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read open requests"
    ON recommendation_requests FOR SELECT USING (status = 'open');
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner read own requests"
    ON recommendation_requests FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated insert requests"
    ON recommendation_requests FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner update own requests"
    ON recommendation_requests FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner or admin delete requests"
    ON recommendation_requests FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── recommendation_responses ──────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE recommendation_responses ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table recommendation_responses does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read responses"
    ON recommendation_responses FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated insert responses"
    ON recommendation_responses FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated update vote count"
    ON recommendation_responses FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner or admin delete responses"
    ON recommendation_responses FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── recommendation_response_votes ─────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE recommendation_response_votes ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table recommendation_response_votes does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read votes"
    ON recommendation_response_votes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated insert own votes"
    ON recommendation_response_votes FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated delete own votes"
    ON recommendation_response_votes FOR DELETE TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── content_reports ───────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table content_reports does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated submit reports"
    ON content_reports FOR INSERT TO authenticated
    WITH CHECK (reported_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin read reports"
    ON content_reports FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin delete reports"
    ON content_reports FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── listing_claims ────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE listing_claims ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table listing_claims does not exist, skipping.'; END $$;

-- ── review_replies ────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table review_replies does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read review replies"
    ON review_replies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner insert review reply"
    ON review_replies FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner or admin delete review reply"
    ON review_replies FOR DELETE TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── community_events ──────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table community_events does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read approved events"
    ON community_events FOR SELECT USING (status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin read all events"
    ON community_events FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated submit event"
    ON community_events FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin update events"
    ON community_events FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── community_alerts ──────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE community_alerts ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table community_alerts does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read active alerts"
    ON community_alerts FOR SELECT USING (dismissed_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin insert alerts"
    ON community_alerts FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin update alerts"
    ON community_alerts FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── listing_views ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table listing_views does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "anyone log views"
    ON listing_views FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anyone read views"
    ON listing_views FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ── provider_tags ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE provider_tags ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table provider_tags does not exist, skipping.'; END $$;

DO $$ BEGIN
  CREATE POLICY "public read provider tags"
    ON provider_tags FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin manage provider tags"
    ON provider_tags FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- Done. Any NOTICE lines in the output mean that table doesn't exist yet —
-- run the corresponding supabase/*.sql migration file to create it, then
-- re-run this file to apply RLS to it.
-- ══════════════════════════════════════════════════════════════════════════════
