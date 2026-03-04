-- Community alerts table (admin-posted, e.g. boil water advisories)
create table if not exists community_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'grayscounty',
  title text not null,
  description text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);

create index if not exists community_alerts_tenant_active
  on community_alerts(tenant_id, dismissed_at);
