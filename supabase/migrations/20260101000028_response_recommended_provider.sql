-- Allow recommendation responses to optionally tag a directory listing
alter table public.recommendation_responses
  add column if not exists recommended_provider_id uuid references public.providers(id) on delete set null;
