-- 147_test_data_cleanup.sql
--
-- 10 September 2026. Authorised after the owner confirmed every payment on the
-- platform to date was a test. Full snapshot in schema backup_20260910, taken
-- in migration 146 and verified row-for-row before this ran.
--
-- Deliberately NOT here: the nineteen orders. See the note at the bottom.

-- ── A7. Four QA blog rows, three of them live on the public /blog ───────
--
-- /blog was serving "QA-TEST markdown rendering check (delete me)", "QA test
-- blog 2026-08-30 (delete me)" and one titled "teest" to anybody who visited.
-- The fourth is rejected and was already invisible.
--
-- Matched by id rather than by `slug like 'qa-test-%'`, because that pattern
-- catches three of the four and silently leaves "teest-791hwe" published. Three
-- rows in blog_featured_artworks cascade with these and are in the snapshot.
delete from public.blogs
 where id in (
   '25cb2c0e-57d3-4040-bc86-7216b2166727',  -- qa-test-markdown-rendering-check-delete-me-i4465r, published
   '5d844619-a9ff-4167-b345-40714f49f610',  -- qa-test-blog-2026-08-30-delete-me-ngj7rw, published
   '894c4f52-5631-44b9-bd8f-8ed4bf71b2a2',  -- qa-test-pass2-reject-path-blog-delete-me-6bm1z5, rejected
   (select id from public.blogs where slug = 'teest-791hwe')
 );

-- ── A3. Two curation requests that never paid ──────────────────────────
--
-- Venues named "test" (21 April) and "a" (23 April), neither with an amount.
-- Voided rather than deleted: `cancelled` is in the status CHECK, the rows are
-- the only evidence that chain was ever exercised, and nothing references them
-- (programme_rent_accruals is empty).
update public.curation_requests
   set status = 'cancelled',
       cancelled_at = now(),
       admin_notes = trim(both E'\n' from coalesce(admin_notes, '') ||
         E'\n2026-09-10: voided during pre-launch test-data cleanup. Never paid.'),
       updated_at = now()
 where status = 'pending_payment';

-- ── A5. Two refund requests left pending for months ────────────────────
--
-- £169.90 from 12 April and £149.99 from 14 May, not the £1.70 and £1.50 the
-- RAG recorded. `rejected` with a reason is exactly what POST /api/refunds/
-- process writes on the reject path, so this leaves the rows in a state the
-- application already understands rather than inventing one.
update public.refund_requests
   set status = 'rejected',
       rejection_reason = 'Voided 2026-09-10 during pre-launch test-data cleanup. The underlying payment was a test transaction, so there is nothing to refund.',
       processed_at = now()
 where status = 'pending';

-- ── A6. Three accepted offers that were never paid ─────────────────────
--
-- £127.00 and £18.02 from 30 April, £27.50 from 28 August, all from
-- test@testingvenue.com against the owner's own artist account. `expired` is
-- the honest terminal state for an accepted offer that was never paid, and it
-- is in the status CHECK.
update public.purchase_offers
   set status = 'expired',
       updated_at = now()
 where status = 'accepted'
   and paid_at is null;

-- ── A4 is NOT in this migration, on purpose ────────────────────────────
--
-- The RAG's action for the six unattributed orders is "clear them with the
-- test-data reset". No such reset exists in the repository; the phrase refers
-- to a script that was never written.
--
-- More to the point, clearing six of nineteen orders is worse than clearing
-- all of them or none. Every one of the nineteen is now known to be a test
-- payment, so the six are not a distinct population, they are just the six the
-- earlier audit happened to notice. Deleting them would leave thirteen
-- identical rows behind and their six order_events orphaned, because
-- order_events carries no foreign key to orders.
--
-- scripts/reset-test-data.ts does the whole job properly and is reviewable
-- before it runs. Whether to run it at all is a product decision: the orders
-- are the only evidence the money chain has ever completed end to end.
