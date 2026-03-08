-- Listing view tracking for owner analytics
create table if not exists listing_views (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  tenant_id text not null default 'grayscounty',
  session_key text not null,
  viewed_at timestamptz not null default now()
);

-- Fast lookups by provider + time for stats queries
create index if not exists listing_views_provider_time
  on listing_views(provider_id, viewed_at);

-- Prevent counting the same browser session twice per listing
create unique index if not exists listing_views_session_unique
  on listing_views(provider_id, session_key);

-- RLS: owners can read their own listing's views; anyone can insert
alter table listing_views enable row level security;

create policy "Anyone can log a view"
  on listing_views for insert
  with check (true);

create policy "Owner can read own listing views"
  on listing_views for select
  using (
    provider_id in (
      select id from providers where claimed_by = auth.uid()
    )
  );
