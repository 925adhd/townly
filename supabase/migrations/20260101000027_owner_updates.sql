-- Owner updates: one pinned notice per claimed business
create table if not exists public.owner_updates (
  id uuid default gen_random_uuid() primary key,
  provider_id uuid references public.providers(id) on delete cascade not null unique,
  tenant_id text not null default 'grayson',
  content text not null check (char_length(content) <= 280),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.owner_updates enable row level security;

-- Anyone can read
create policy "Public can read owner updates"
  on public.owner_updates for select using (true);

-- Claimed owner can manage their own update
create policy "Owner can manage their update"
  on public.owner_updates for all
  using (
    exists (
      select 1 from public.providers
      where providers.id = owner_updates.provider_id
        and providers.claimed_by = auth.uid()
    )
  );

-- Admins/mods can manage any
create policy "Admins can manage all owner updates"
  on public.owner_updates for all
  using (public.is_admin_or_mod());
