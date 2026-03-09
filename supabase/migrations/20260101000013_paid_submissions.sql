-- Paid spotlight / featured post submissions
create table if not exists paid_submissions (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          text        not null default 'grayson',
  type               text        not null check (type in ('spotlight', 'featured')),
  title              text        not null,
  description        text        not null,
  event_date         text,
  location           text,
  town               text,
  image_url          text,
  contact_name       text        not null,
  contact_email      text        not null,
  contact_phone      text,
  submitted_by       uuid        references auth.users(id),
  submitted_by_name  text,
  status             text        not null default 'pending_review'
                                 check (status in ('pending_review', 'approved', 'rejected')),
  payment_status     text        not null default 'unpaid'
                                 check (payment_status in ('unpaid', 'paid')),
  stripe_session_id  text,
  -- week_start is always the Sunday of the booked week (Sunday 12:00 AM)
  week_start         date        not null,
  admin_notes        text,
  created_at         timestamptz not null default now()
);

-- Only one spotlight per week per tenant
create unique index paid_submissions_spotlight_week_unique
  on paid_submissions (tenant_id, week_start)
  where type = 'spotlight' and status != 'rejected';

-- Max 5 featured per week enforced at app layer (see api.ts)

alter table paid_submissions enable row level security;

-- Authenticated users can submit
create policy "Users can insert own paid_submissions"
  on paid_submissions for insert
  with check (auth.uid() = submitted_by);

-- Users can view their own submissions
create policy "Users can view own paid_submissions"
  on paid_submissions for select
  using (auth.uid() = submitted_by);

-- Admins have full access
create policy "Admins can manage all paid_submissions"
  on paid_submissions for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Public can read approved submissions (for display on events page)
create policy "Public can view approved paid_submissions"
  on paid_submissions for select
  using (status = 'approved');
