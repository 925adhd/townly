-- ─────────────────────────────────────────────────────────────
-- content_reports table
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ─────────────────────────────────────────────────────────────

create table if not exists content_reports (
  id               uuid        default gen_random_uuid() primary key,
  content_type     text        not null check (content_type in ('provider', 'lost_found', 'recommendation_request', 'recommendation_response')),
  content_id       text        not null,
  content_title    text,
  reported_by      uuid        references auth.users(id) on delete set null,
  reported_by_name text,
  reason           text,
  created_at       timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────

alter table content_reports enable row level security;

-- Any logged-in user can submit a report
create policy "Authenticated users can insert reports"
  on content_reports
  for insert
  to authenticated
  with check (true);

-- Only admins can read reports
create policy "Admins can read reports"
  on content_reports
  for select
  to authenticated
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );

-- Only admins can delete (dismiss) reports
create policy "Admins can delete reports"
  on content_reports
  for delete
  to authenticated
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );
