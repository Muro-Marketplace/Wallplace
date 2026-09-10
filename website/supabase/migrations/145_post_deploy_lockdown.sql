-- 145_post_deploy_lockdown.sql
--
-- APPLY THIS IN THE SAME WINDOW AS THE DEPLOY. NOT BEFORE.
--
-- UK compliance audit, 10 September 2026, findings SEC-9 and SEC-10. This is
-- the second half of migration 140, split out because it is the only part that
-- cannot be applied ahead of the code.
--
-- Everything here closes a door that production's CURRENT code still walks
-- through. Each one is safe the moment the branch is deployed and breaks a
-- live surface if applied before it. That is the only thing these two changes
-- have in common, and it is enough: one migration means one thing for the
-- owner to get in the right order rather than two.
--
-- 1. `message-attachments` and `wall-renders` become private.
--    Production reads both through `getPublicUrl()`, which returns a URL that
--    404s on a private bucket. Applied early, every wall-visualiser preview
--    and that one message attachment break for real users until the code
--    lands. The branch replaces those reads with short-lived signed URLs.
--
-- 2. The four always-true anon INSERT policies are dropped.
--    api/waitlist, api/contact, api/register-venue and api/enquiry each did
--    their insert with the ANON client, which is precisely why those policies
--    existed. Dropping them early takes the waitlist, the contact form, venue
--    registration and artist enquiries offline. The branch moves all four onto
--    the service-role client, which bypasses RLS, so afterwards the policies
--    are protecting nothing except an unvalidated write path around each
--    route's zod schema, its rate limit and its notifications.
--
-- The ordering that works:
--   1. migrations 140 to 144   (safe against the old code)
--   2. deploy the branch       (signed reads go live; the buckets are still
--                               public, so nothing is broken in between)
--   3. this migration          (the buckets close behind the new code)
--
-- Step 2 before step 3 is the whole point. Between them the signed URLs work
-- against a public bucket, which is correct but not yet private; after step 3
-- the public URLs stop working and only the signed ones remain.
--
-- Rollback, if the deploy is reverted: set `public = true` on both buckets and
-- recreate the four INSERT policies as `WITH CHECK (true)` for anon. Nothing in
-- 140 to 144 needs undoing, because all of that is safe against either version
-- of the code. That is the property the split was for.

-- ── 1. The two leaking buckets ──────────────────────────────────────────
update storage.buckets
   set public = false
 where id in ('message-attachments', 'wall-renders');

-- ── 2. The four direct-insert paths ─────────────────────────────────────
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

notify pgrst, 'reload schema';
