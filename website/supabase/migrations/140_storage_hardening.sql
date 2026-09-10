-- 140_storage_hardening.sql
--
-- UK compliance audit, 10 September 2026. Three storage findings, one file.
--
-- ── 1. Uploads were unbounded and unowned ───────────────────────────────
--
-- `artworks` and `avatars` carried an INSERT policy whose entire WITH CHECK
-- was `bucket_id = 'artworks'`. Any authenticated user could write any file,
-- of any type, at any size, to any path, including another user's prefix.
-- Both buckets also had NULL allowed_mime_types and NULL file_size_limit, so
-- the only validation was client-side in src/lib/upload.ts, which a direct
-- call to the storage REST API skips entirely.
--
-- That is what made the Next.js image-optimiser AVIF advisory
-- (GHSA-2xp9-vwfh-vxw4) reachable rather than theoretical: the Supabase host
-- is allowlisted in next.config.ts `remotePatterns`, so a crafted file
-- uploaded here could be handed to /_next/image. The optimiser is patched
-- separately by the next@16.3.4 upgrade; this closes the delivery path, which
-- is worth closing on its own account.
--
-- ── 2. Private conversation attachments were world-readable ─────────────
--
-- `message-attachments` was a PUBLIC bucket. Every file sent inside a private
-- conversation, PDFs included, sat at a stable unauthenticated URL forever.
-- Migration 070 dropped the SELECT policy, which does nothing at all while
-- the bucket's own `public` flag is true, as its own comment conceded
-- ("Buckets stay public; object URLs keep working").
--
-- ── 3. A private photo was republished through its derivative ───────────
--
-- `wall-renders` was public and holds composites built from `wall-photos`,
-- which is correctly private. A venue uploaded a photograph of its interior
-- on the understanding it was private, and the visualiser republished that
-- photograph inside every render at a public URL.
--
-- Reads for both now go through short-lived signed URLs, minted only after the
-- reader's entitlement has been checked. See src/lib/messages/attachment-urls.ts
-- (signed inside GET /api/messages/[conversationId], after
-- assertConversationParticipant) and src/lib/visualizer/renders-db.ts.
--
-- The one place a render is still meant to be public is an artist promoting it
-- to a mockup on their listing. api/works/[id]/mockups now COPIES the object
-- into the public `artworks` bucket to do that, so publishing is a deliberate
-- act rather than the default.
--
-- Note on `collections`: it is narrowed to images here, and the contract
-- upload fallback that used to write PDFs into it has been removed from
-- src/lib/upload.ts in the same change. That fallback wrote signed
-- agreements into a PUBLIC bucket whenever the private `contracts` bucket
-- looked absent, which is the failure mode you least want a fallback for.

-- ── Bucket-level type and size caps ─────────────────────────────────────
-- 10MB matches MAX_FILE_SIZE in src/lib/upload.ts. wall-photos gets 15MB to
-- match MAX_BYTES in api/walls/upload-photo, which is sized for phone photos.

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
 where id in ('artworks', 'avatars', 'collections');

update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id = 'wall-photos';

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/webp', 'image/png']
 where id = 'wall-renders';

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array[
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'image/png',
         'image/jpeg'
       ]
 where id = 'contracts';

-- ── Private the two leaking buckets ─────────────────────────────────────
update storage.buckets
   set public = false
 where id in ('message-attachments', 'wall-renders');

-- ── Folder ownership on every client-writable bucket ────────────────────
-- The path convention everywhere in src/lib/upload.ts is `${user.id}/<file>`,
-- so the first path segment is the owner and RLS can say so.

drop policy if exists "Authenticated users can upload artworks" on storage.objects;
drop policy if exists "artworks_owner_insert" on storage.objects;
create policy "artworks_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "artworks_owner_delete" on storage.objects;
create policy "artworks_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- `collections` already had the ownership check but granted it to `public`,
-- which includes `anon`, and left auth.uid() unwrapped so it re-evaluated per
-- row. Narrowed to `authenticated` and wrapped, matching migration 070's
-- initplan pass.
drop policy if exists "collections_storage_owner_insert" on storage.objects;
create policy "collections_storage_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'collections'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "collections_storage_owner_update" on storage.objects;
create policy "collections_storage_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'collections'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "collections_storage_owner_delete" on storage.objects;
create policy "collections_storage_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'collections'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- The uploader may read their OWN objects in the two now-private buckets. That
-- is what lets the sender see the attachment they just sent without a round
-- trip to the server, and it is strictly narrower than the world-readable
-- state it replaces. Everyone ELSE reads through a server-minted signed URL,
-- issued only after the reader is proved a party to the conversation. See
-- src/lib/messages/attachment-urls.ts.
drop policy if exists "message_attachments_owner_read" on storage.objects;
create policy "message_attachments_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "wall_renders_owner_read" on storage.objects;
create policy "wall_renders_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wall-renders'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';
