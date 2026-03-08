create table if not exists public.community_events (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  user_name   text not null,
  title       text not null,
  description text not null,
  event_date  date not null,
  location    text not null,
  town        text not null,
  photo_url   text,
  status      text not null default 'pending',
  tenant_id   text not null default 'grayson',
  created_at  timestamptz default now()
);

alter table public.community_events enable row level security;

-- Anyone can read approved events
create policy "Anyone can read approved events"
  on public.community_events for select
  using (status = 'approved' or auth.uid() = user_id);

-- Authenticated users can submit events
create policy "Authenticated users can insert events"
  on public.community_events for insert
  with check (auth.uid() = user_id);

-- Users can delete their own pending events; admins handle the rest
create policy "Users can delete own events"
  on public.community_events for delete
  using (auth.uid() = user_id);

-- Service role (admin) can update status
create policy "Admin can update event status"
  on public.community_events for update
  using (true);
