-- Lost & Found replies
CREATE TABLE IF NOT EXISTS lost_found_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES lost_found_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'grayson',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lf_replies_post ON lost_found_replies(post_id);
CREATE INDEX idx_lf_replies_tenant ON lost_found_replies(tenant_id);

ALTER TABLE lost_found_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lost_found_replies"
  ON lost_found_replies FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert their own replies"
  ON lost_found_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON lost_found_replies FOR DELETE
  USING (auth.uid() = user_id);
