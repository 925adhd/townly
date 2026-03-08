-- ── providers table: new columns ──────────────────────────────────────────────
-- Run these against your Supabase project via the SQL editor.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS claim_status  text        NOT NULL DEFAULT 'unclaimed',
  ADD COLUMN IF NOT EXISTS claimed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS listing_tier  text        NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS address       text,
  ADD COLUMN IF NOT EXISTS hours         text;

-- Constrain valid values
ALTER TABLE providers
  ADD CONSTRAINT providers_claim_status_check
    CHECK (claim_status IN ('unclaimed', 'claimed')),
  ADD CONSTRAINT providers_listing_tier_check
    CHECK (listing_tier IN ('none', 'standard', 'spotlight'));

-- ── listing_claims table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_claims (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_name       text        NOT NULL DEFAULT '',
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name           text        NOT NULL DEFAULT '',
  user_email          text        NOT NULL DEFAULT '',
  verification_method text        NOT NULL CHECK (verification_method IN ('email', 'phone', 'manual')),
  verification_detail text        NOT NULL DEFAULT '',
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── provider-photos storage bucket ────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage → New Bucket:
--   Name: provider-photos
--   Public: true
-- Or via SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-photos', 'provider-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ── Row Level Security ─────────────────────────────────────────────────────────

-- listing_claims: anyone authenticated can insert their own claim
ALTER TABLE listing_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can submit claims"
  ON listing_claims FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only admins can read claims (use service role in admin actions, or adjust to your role setup)
CREATE POLICY "admins can read claims"
  ON listing_claims FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

CREATE POLICY "admins can update claims"
  ON listing_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

-- providers: owners can update their own claimed listing fields
CREATE POLICY "owners can update their listing"
  ON providers FOR UPDATE
  TO authenticated
  USING (claimed_by = auth.uid())
  WITH CHECK (claimed_by = auth.uid());

-- provider-photos: owners can upload to their own folder
CREATE POLICY "owner photo upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'provider-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "provider photos are public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'provider-photos');
