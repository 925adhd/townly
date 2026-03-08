-- Multi-tenant migration
-- Run this in your Supabase SQL editor.
-- All existing rows are assigned to 'grayscounty' (Grayson County).

-- ── Add tenant_id to every content table ─────────────────────────────────────

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'grayscounty';

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'grayscounty';

ALTER TABLE lost_found_posts
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'grayscounty';

ALTER TABLE recommendation_requests
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'grayscounty';

ALTER TABLE recommendation_responses
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'grayscounty';

ALTER TABLE listing_claims
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'grayscounty';

ALTER TABLE content_reports
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'grayscounty';

-- ── Indexes for query performance ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS providers_tenant_idx              ON providers(tenant_id);
CREATE INDEX IF NOT EXISTS reviews_tenant_idx                ON reviews(tenant_id);
CREATE INDEX IF NOT EXISTS lost_found_posts_tenant_idx       ON lost_found_posts(tenant_id);
CREATE INDEX IF NOT EXISTS recommendation_requests_tenant_idx ON recommendation_requests(tenant_id);
CREATE INDEX IF NOT EXISTS recommendation_responses_tenant_idx ON recommendation_responses(tenant_id);
CREATE INDEX IF NOT EXISTS listing_claims_tenant_idx         ON listing_claims(tenant_id);
CREATE INDEX IF NOT EXISTS content_reports_tenant_idx        ON content_reports(tenant_id);

-- ── Composite indexes (most common query pattern: tenant + status) ────────────

CREATE INDEX IF NOT EXISTS providers_tenant_status_idx
  ON providers(tenant_id, status);

CREATE INDEX IF NOT EXISTS lost_found_posts_tenant_status_idx
  ON lost_found_posts(tenant_id, status);

CREATE INDEX IF NOT EXISTS recommendation_requests_tenant_status_idx
  ON recommendation_requests(tenant_id, status);

-- ── Notes on RLS ──────────────────────────────────────────────────────────────
-- Tenant scoping is enforced at the application layer (api.ts filters by tenant_id).
-- If you want DB-level enforcement, add policies like:
--
--   CREATE POLICY "tenant isolation" ON providers
--     USING (tenant_id = current_setting('app.tenant_id', true));
--
-- and call `SET LOCAL app.tenant_id = '...'` at the start of each request
-- (requires a Postgres function or Edge Function wrapper).
-- For most early-stage deployments, application-layer filtering is sufficient.
