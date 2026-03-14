-- ══════════════════════════════════════════════════════════════════════════════
-- AUTO-HIDE FLAGGED COMMUNITY EVENTS
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- When a community_event accumulates 3 content_reports it is automatically
-- hidden (status → 'pending') so it disappears from the public feed.
-- Admins see it in the Events tab and can Restore or Delete it.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_hide_flagged_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_type = 'community_event' THEN
    UPDATE community_events
    SET status = 'pending'
    WHERE id = NEW.content_id::uuid
      AND status = 'approved'
      AND (
        SELECT COUNT(*)
        FROM content_reports
        WHERE content_type = 'community_event'
          AND content_id = NEW.content_id
      ) >= 3;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_event_flag_count ON content_reports;
CREATE TRIGGER check_event_flag_count
  AFTER INSERT ON content_reports
  FOR EACH ROW EXECUTE FUNCTION auto_hide_flagged_event();
