-- profiles table: one row per user, visible in Supabase Table Editor
-- Set role to 'admin' or 'moderator' directly in the dashboard to grant access.

create table if not exists public.profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  role text default null  -- null = regular user, 'admin', 'moderator'
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert only the columns that exist on the profiles table (id, role).
  -- 'name' does NOT exist on this table — it lives in auth.users.user_metadata.
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: users can only read their own row. You edit roles via the dashboard.
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);
