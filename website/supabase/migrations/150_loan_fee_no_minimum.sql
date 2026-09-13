-- 150: no minimum monthly loan fee.
-- Owner decision 13 September 2026, replacing the £15 floor of 2026-08-28.
--
-- A per-size paid loan fee is now any amount above £0, up to £100,000. Only the
-- body of the function behind migration 149's check changes; the constraint
-- keeps pointing at it, and the function keeps its grants, including EXECUTE
-- for authenticated, which artists' own direct updates need. Every existing row
-- passed the old £15 floor, so every existing row passes this.
--
-- Placement fees never had a database floor (the app enforced it and no longer
-- does). Migration 148's retired paid_loan_monthly_gbp column keeps its old
-- check: nothing reads or writes that column any more.

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
      and (e ->> 'paidLoanMonthlyGbp')::numeric > 0
      and (e ->> 'paidLoanMonthlyGbp')::numeric <= 100000
    )
  ), true)
  from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) as e
$$;
