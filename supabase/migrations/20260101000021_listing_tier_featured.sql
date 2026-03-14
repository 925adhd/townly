-- Add 'featured' to the listing_tier check constraint
alter table providers drop constraint if exists providers_listing_tier_check;
alter table providers add constraint providers_listing_tier_check
  check (listing_tier in ('none', 'standard', 'featured', 'spotlight'));
