-- Add slug to recommendation_requests for shareable URLs
alter table recommendation_requests add column if not exists slug text;

-- Unique per tenant (nulls excluded from unique constraint in Postgres)
create unique index if not exists recommendation_requests_slug_tenant
  on recommendation_requests(slug, tenant_id)
  where slug is not null;
