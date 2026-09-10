-- 143_erasure_and_grants.sql
--
-- UK compliance audit, 10 September 2026. Four findings, all database-side.
--
-- ── 1. Erasure could not complete for an artist with a collection ───────
--
-- `artist_collections.artist_id` referenced `artist_profiles(id)` with
-- ON DELETE NO ACTION. POST /api/account/delete deletes artist_profiles LAST,
-- so for any artist who had ever created a collection that delete raised a
-- foreign key violation, the route collected the failure, refused to remove
-- the auth user (correctly: it will not half-erase), and answered 500.
--
-- The effect: an artist with a collection could not exercise the right to
-- erasure at all, by any self-service route. Article 17 with a hard stop in
-- front of it.
--
-- CASCADE is the right semantics here and not just the convenient one. A
-- collection is a grouping of that artist's own works, owned by the profile,
-- with no meaning once the profile is gone. Compare `orders`, which is
-- deliberately SET NULL and anonymised rather than deleted, because a
-- financial record outlives the account by law.
--
-- ── 2. Venue Stripe identifiers were readable by anon ───────────────────
--
-- Migration 071 revoked the six contact-PII columns on `venue_profiles` from
-- `anon`. Migrations 076 and 077 later did the same for `artist_profiles` AND
-- included the three Stripe identifiers. Venues were simply left behind by the
-- ordering: 071 shipped before anyone thought about the Stripe columns.
--
-- stripe_customer_id, stripe_subscription_id and stripe_connect_account_id are
-- not credentials and cannot move money. They are account identifiers, and
-- they are exactly what a convincing social-engineering call to a payment
-- provider's support desk is built from. Nothing anon-side reads them.
--
-- ── 3. Four tables accepted direct anon INSERTs ─────────────────────────
--
-- `contact_submissions`, `enquiries`, `venue_registrations` and
-- `waitlist_signups` each carried TWO always-true INSERT policies granted to
-- anon (the Supabase performance advisor flags the duplication; the audit
-- flagged the permission). The publishable key ships in the browser bundle, so
-- anyone could write rows straight into the tables an admin reads, skipping
-- the API's zod validation, its rate limit, and its notification side effects.
--
-- Every one of these tables is written by an API route holding the service
-- role, which bypasses RLS. Deny-all to clients is the correct state, and is
-- what the rest of the schema already does (see
-- docs/security/service-role-only-tables.md).
--
-- ── 4. Artist coordinates were stored at full precision ─────────────────
--
-- src/lib/geo-precision.ts coarsens published coordinates to 2 decimal places,
-- deliberately, so a location stops being a street address while a 5-mile
-- distance filter still means something. That coarsening is applied at the API
-- layer only. Migration 076 kept lat/lng granted to anon on purpose and
-- recorded rounding them as a follow-up; this is that follow-up.
--
-- Rounding at rest rather than revoking the columns: the values come from
-- postcodes.io and are postcode centroids, so 2dp is the honest precision to
-- hold, and rounding keeps every existing reader working. Data minimisation
-- means not keeping what you do not use, and nothing uses the extra digits.

-- ── 1. Collections cascade with the profile they belong to ──────────────
alter table public.artist_collections
  drop constraint if exists artist_collections_artist_id_fkey;

alter table public.artist_collections
  add constraint artist_collections_artist_id_fkey
  foreign key (artist_id) references public.artist_profiles(id) on delete cascade;

-- ── 2. Venue Stripe identifiers, same mechanism as 071/076/077 ──────────
-- A bare `revoke select (col)` is a silent no-op while a TABLE-level grant
-- stands, because the table grant implicitly covers every column. So revoke
-- the table grant and re-grant column by column, by exclusion, which keeps the
-- intent readable and auto-covers any column added later.
do $$
declare
  safe_cols text;
  restricted text[] := array[
    'email', 'phone', 'address_line1', 'address_line2', 'postcode', 'contact_name',
    'stripe_customer_id', 'stripe_subscription_id', 'stripe_connect_account_id'
  ];
  role_name text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into safe_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'venue_profiles'
    and column_name <> all (restricted);

  foreach role_name in array array['anon', 'authenticated'] loop
    execute format('revoke select on public.venue_profiles from %I', role_name);
    execute format('grant select (%s) on public.venue_profiles to %I', safe_cols, role_name);
  end loop;
end $$;

-- ── 3. Close the four direct-insert paths ───────────────────────────────
drop policy if exists "Allow public inserts" on public.contact_submissions;
drop policy if exists "Anyone can insert contact" on public.contact_submissions;

drop policy if exists "Allow public inserts" on public.enquiries;
drop policy if exists "Allow authenticated inserts" on public.enquiries;
drop policy if exists "Anyone can insert enquiry" on public.enquiries;

drop policy if exists "Allow public inserts" on public.venue_registrations;
drop policy if exists "Anyone can insert venue reg" on public.venue_registrations;

drop policy if exists "Allow public inserts" on public.waitlist_signups;
drop policy if exists "Anyone can insert waitlist" on public.waitlist_signups;

-- Belt and braces: RLS only bites where a grant exists, and Supabase grants
-- anon and authenticated explicitly rather than through PUBLIC.
revoke insert on public.contact_submissions from anon, authenticated;
revoke insert on public.enquiries from anon, authenticated;
revoke insert on public.venue_registrations from anon, authenticated;
revoke insert on public.waitlist_signups from anon, authenticated;

-- `enquiries` keeps its SELECT policy, which lets a signed-in sender read
-- their own. Wrapped so it evaluates once per query rather than once per row
-- (the Supabase advisor's auth_rls_initplan warning, the last one outstanding).
drop policy if exists "Users can read own enquiries" on public.enquiries;
create policy "Users can read own enquiries" on public.enquiries
  for select to public
  using (
    sender_email = ((select auth.jwt()) ->> 'email'::text)
    or (select auth.role()) = 'service_role'::text
  );

-- ── 4. Round artist coordinates to the precision we actually publish ────
create or replace function public.artist_profiles_coarsen_coords()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- 2dp, matching PUBLIC_COORD_DECIMALS in src/lib/geo-precision.ts. Keep the
  -- two in step: the whole point is that the stored value and the published
  -- value are the same value.
  if new.lat is not null then
    new.lat := round(new.lat::numeric, 2);
  end if;
  if new.lng is not null then
    new.lng := round(new.lng::numeric, 2);
  end if;
  return new;
end;
$$;

-- Migration 125's rule: a trigger function is called by the trigger, never by
-- a client, so no client role needs EXECUTE on it.
revoke execute on function public.artist_profiles_coarsen_coords() from public, anon, authenticated;

drop trigger if exists artist_profiles_coarsen_coords_trg on public.artist_profiles;
create trigger artist_profiles_coarsen_coords_trg
  before insert or update of lat, lng on public.artist_profiles
  for each row execute function public.artist_profiles_coarsen_coords();

-- Bring the rows that already exist down to the same precision.
update public.artist_profiles
   set lat = round(lat::numeric, 2),
       lng = round(lng::numeric, 2)
 where lat is not null or lng is not null;

notify pgrst, 'reload schema';
