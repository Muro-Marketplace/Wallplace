-- 144_artist_trader_status.sql
--
-- UK compliance audit, 10 September 2026, finding CON-2.
--
-- The artist application has asked "are you applying as an individual or a
-- business?" since migration 030, and stored the answer on
-- `artist_applications.trader_status`. Nothing has ever read it except one
-- line of the admin CRM. It never reached the artist's profile, and it never
-- reached a buyer.
--
-- That matters because it changes what rights the buyer has:
--
--   * The Consumer Contracts (Information, Cancellation and Additional
--     Charges) Regulations 2013, including the 14-day right to cancel, apply
--     to a contract between a TRADER and a consumer. They do not apply to a
--     private sale between two consumers.
--   * Most of the Consumer Rights Act 2015 Part 1 works the same way.
--
-- Wallplace's Terms and its Returns page tell every buyer they have a 14-day
-- cooling-off right, unconditionally. Where the seller is a consumer that is
-- either misleading, or it means Wallplace has quietly assumed the trader's
-- obligations itself. Which of the two is a question for a solicitor and is on
-- the legal-review list; either way the buyer has to be able to see the answer,
-- and CMA guidance on the DMCC Act is that an online marketplace is
-- responsible for the information in an invitation to purchase even where it
-- is not the seller.
--
-- This column carries the declaration onto the profile so the listing can show
-- it. Nullable, because a row that predates the column has no declaration on
-- file, and "we have not confirmed this" is the honest rendering of that. It is
-- never guessed in either direction.

alter table public.artist_profiles
  add column if not exists trader_status text
  check (trader_status in ('consumer', 'business'));

comment on column public.artist_profiles.trader_status is
  'Declared on the artist application (migration 030). Drives the seller-information block on a listing, because it changes which consumer rights a buyer has. NULL means no declaration on file, not "assume consumer" and not "assume business".';

-- Backfill from the application the profile came from, matched on the email
-- the account was created with. Only where the application actually recorded
-- an answer: an application that predates migration 030 leaves the profile
-- null, which is correct.
update public.artist_profiles p
   set trader_status = a.trader_status
  from public.artist_applications a
       join auth.users u on lower(u.email) = lower(a.email)
 where p.user_id = u.id
   and a.trader_status in ('consumer', 'business')
   and p.trader_status is null;

notify pgrst, 'reload schema';
