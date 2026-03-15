-- Add soft-delete support to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- RPC: soft_delete_account
-- Marks the calling user's profile as deleted and anonymizes their content.
-- Runs as SECURITY DEFINER so it can update rows across tables.
CREATE OR REPLACE FUNCTION soft_delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mark profile deleted
  UPDATE profiles
    SET deleted_at = now(), name = 'Deleted User'
    WHERE id = v_user_id;

  -- Anonymize all content
  UPDATE community_events       SET user_name = 'Deleted User' WHERE user_id = v_user_id;
  UPDATE lost_found_posts        SET user_name = 'Deleted User' WHERE user_id = v_user_id;
  UPDATE recommendation_requests SET user_name = 'Deleted User' WHERE user_id = v_user_id;
  UPDATE recommendation_responses SET user_name = 'Deleted User' WHERE user_id = v_user_id;
  UPDATE reviews                 SET reviewer_name = 'Deleted User' WHERE reviewer_id = v_user_id;
END;
$$;

-- Allow authenticated users to call this function on themselves only
GRANT EXECUTE ON FUNCTION soft_delete_account() TO authenticated;
