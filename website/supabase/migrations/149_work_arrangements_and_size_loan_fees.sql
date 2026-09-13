-- 149: per-work arrangement ticks and per-size paid loan fees.
-- Spec: docs/superpowers/specs/2026-09-13-work-arrangements-and-per-size-loan-fees-design.md
--
-- 1. Two nullable booleans on artist_works. Null follows the artist's profile,
--    so every existing work keeps doing exactly what it does today.
-- 2. A CHECK on each pricing entry's paidLoanMonthlyGbp. Row security lets an
--    artist update their own row with the publishable key and skip zod, so the
--    range lives here too, as migration 148 did for its columns.
--
-- Safe against the code already deployed: nothing reads the new columns yet,
-- and no pricing entry carries the key (checked 13 September 2026, 36 rows).

alter table public.artist_works
  add column if not exists open_to_revenue_share boolean,
  add column if not exists open_to_free_loan boolean;

comment on column public.artist_works.open_to_revenue_share is
  'Null follows artist_profiles.open_to_revenue_share. True or false is this work''s own setting.';
comment on column public.artist_works.open_to_free_loan is
  'Paid loan, under the legacy name artist_profiles uses. Null follows artist_profiles.open_to_free_loan.';

-- SECURITY INVOKER (the default), and EXECUTE stays with authenticated:
-- Postgres checks EXECUTE on a CHECK constraint's function for the role doing
-- the write, so revoking it would block every direct update an artist makes.
create or replace function public.artist_work_pricing_loan_fees_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(
    jsonb_typeof(e -> 'paidLoanMonthlyGbp') is null
    or jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'null'
    or (
      jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'number'
      and (e ->> 'paidLoanMonthlyGbp')::numeric >= 15
      and (e ->> 'paidLoanMonthlyGbp')::numeric <= 100000
    )
  ), true)
  from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) as e
$$;

alter table public.artist_works
  drop constraint if exists artist_works_pricing_loan_fees_range,
  add constraint artist_works_pricing_loan_fees_range
    check (public.artist_work_pricing_loan_fees_valid(pricing));

notify pgrst, 'reload schema';
