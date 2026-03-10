-- Add separate image columns for banner, thumbnail, and flyer
alter table paid_submissions
  add column if not exists thumbnail_url text,
  add column if not exists flyer_url     text;

-- image_url remains as the banner image (existing column, no change needed)
