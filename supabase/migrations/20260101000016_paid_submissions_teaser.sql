-- Add teaser column to paid_submissions
-- teaser: short home-page hook (≤120 chars); description: full events-page copy
ALTER TABLE paid_submissions
  ADD COLUMN IF NOT EXISTS teaser text;
