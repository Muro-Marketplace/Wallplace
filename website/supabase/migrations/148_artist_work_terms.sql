-- 148_artist_work_terms.sql
--
-- Per-artwork revenue share and paid loan fee.
-- Spec: docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md
--
-- Two nullable columns on artist_works. Null means "use the artist's profile
-- default" for the share and "no listed fee" for the loan fee, so every existing
-- row keeps its current behaviour and nothing visible changes until an artist
-- sets a value.
--
-- The ranges live here as well as in zod. Row security lets a signed-in artist
-- update their own artist_works rows directly with the publishable key, which
-- never passes through the API's validation. The fee floor is PAID_LOAN_MIN_GBP
-- in src/lib/pricing.ts; tests/integration/artist-work-terms-migration.test.ts
-- fails if the two disagree.
--
-- Safe against both the old and the new code: the old code never names these
-- columns, and select("*") readers simply receive two more keys. Apply it before
-- the deploy. artist_works is granted at table level, so no grant change.

alter table public.artist_works
  add column if not exists revenue_share_percent integer,
  add column if not exists paid_loan_monthly_gbp numeric;

alter table public.artist_works
  drop constraint if exists artist_works_revenue_share_percent_range,
  add constraint artist_works_revenue_share_percent_range
    check (revenue_share_percent is null or revenue_share_percent between 0 and 100);

alter table public.artist_works
  drop constraint if exists artist_works_paid_loan_monthly_gbp_range,
  add constraint artist_works_paid_loan_monthly_gbp_range
    check (paid_loan_monthly_gbp is null or (paid_loan_monthly_gbp >= 15 and paid_loan_monthly_gbp <= 100000));

notify pgrst, 'reload schema';
