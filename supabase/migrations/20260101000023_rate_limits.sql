-- Rate limiting triggers for lost_found_posts, recommendation_requests,
-- recommendation_responses, and paid_submissions.
-- Follows the same pattern as check_review_rate_limit (migration 010).
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- ── Lost & Found posts: 5 per user per 24 hours ───────────────────────────────
CREATE OR REPLACE FUNCTION check_lost_found_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM lost_found_posts
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT_LOST_FOUND';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_lost_found_rate_limit ON lost_found_posts;
CREATE TRIGGER trg_check_lost_found_rate_limit
  BEFORE INSERT ON lost_found_posts
  FOR EACH ROW EXECUTE FUNCTION check_lost_found_rate_limit();


-- ── Recommendation requests: 5 per user per 24 hours ─────────────────────────
CREATE OR REPLACE FUNCTION check_request_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM recommendation_requests
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT_REQUESTS';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_request_rate_limit ON recommendation_requests;
CREATE TRIGGER trg_check_request_rate_limit
  BEFORE INSERT ON recommendation_requests
  FOR EACH ROW EXECUTE FUNCTION check_request_rate_limit();


-- ── Recommendation responses: 20 per user per 24 hours ───────────────────────
CREATE OR REPLACE FUNCTION check_response_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM recommendation_responses
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'RATE_LIMIT_RESPONSES';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_response_rate_limit ON recommendation_responses;
CREATE TRIGGER trg_check_response_rate_limit
  BEFORE INSERT ON recommendation_responses
  FOR EACH ROW EXECUTE FUNCTION check_response_rate_limit();


-- ── Paid submissions: 3 per user per 24 hours ────────────────────────────────
-- Defense-in-depth alongside Stripe payment — prevents replaying sessions
-- or scripting the submitSpotlightBooking endpoint.
CREATE OR REPLACE FUNCTION check_paid_submission_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM paid_submissions
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'RATE_LIMIT_PAID_SUBMISSIONS';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_paid_submission_rate_limit ON paid_submissions;
CREATE TRIGGER trg_check_paid_submission_rate_limit
  BEFORE INSERT ON paid_submissions
  FOR EACH ROW EXECUTE FUNCTION check_paid_submission_rate_limit();
