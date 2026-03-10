-- Add event_time and tags to paid_submissions
alter table paid_submissions
  add column if not exists event_time text,
  add column if not exists tags       text[] not null default '{}';
