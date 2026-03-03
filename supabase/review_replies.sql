-- One owner reply per review
create table if not exists public.review_replies (
  id          uuid default gen_random_uuid() primary key,
  review_id   uuid references public.reviews(id) on delete cascade not null unique,
  provider_id text not null,
  owner_id    uuid not null,
  owner_name  text not null,
  reply_text  text not null,
  created_at  timestamptz default now(),
  tenant_id   text not null default 'grayson'
);

alter table public.review_replies enable row level security;

-- Anyone can read replies
create policy "Anyone can read review replies"
  on public.review_replies for select using (true);

-- Only the owner who created the reply can insert/delete their own
create policy "Owner can insert reply"
  on public.review_replies for insert
  with check (auth.uid() = owner_id);

create policy "Owner can delete own reply"
  on public.review_replies for delete
  using (auth.uid() = owner_id);
