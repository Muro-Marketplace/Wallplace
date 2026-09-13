-- 146_pre_test_data_cleanup_snapshot.sql
--
-- Taken 10 September 2026, immediately before the test-data cleanup authorised
-- after the owner confirmed every payment on the platform was a test.
--
-- Full copies of every table the cleanup touches AND every child table that a
-- foreign key points at it from, because ON DELETE CASCADE is invisible until
-- it has already taken the children. The FK graph that made this list:
--
--   blogs             <- blog_featured_artworks   ON DELETE CASCADE
--   orders            <- refund_requests          ON DELETE RESTRICT
--   orders            <- order_events             NO FK AT ALL (silent orphans)
--   curation_requests <- placements               NO ACTION
--   curation_requests <- programme_rent_accruals  NO ACTION
--   purchase_offers   <- artwork_request_responses SET NULL
--
-- Restore is `insert into public.<t> select * from backup_20260910.<t>` for
-- whichever table went wrong. Drop the whole schema once the cleanup has been
-- confirmed good.

create schema if not exists backup_20260910;

create table backup_20260910.orders                    as select * from public.orders;
create table backup_20260910.order_events              as select * from public.order_events;
create table backup_20260910.refund_requests           as select * from public.refund_requests;
create table backup_20260910.stripe_transfers          as select * from public.stripe_transfers;
create table backup_20260910.blogs                     as select * from public.blogs;
create table backup_20260910.blog_featured_artworks    as select * from public.blog_featured_artworks;
create table backup_20260910.curation_requests         as select * from public.curation_requests;
create table backup_20260910.programme_rent_accruals   as select * from public.programme_rent_accruals;
create table backup_20260910.purchase_offers           as select * from public.purchase_offers;
create table backup_20260910.artwork_request_responses as select * from public.artwork_request_responses;
create table backup_20260910.placements                as select * from public.placements;

-- The snapshot is service-role only, like the rest of the private schema set.
revoke all on schema backup_20260910 from anon, authenticated;
revoke all on all tables in schema backup_20260910 from anon, authenticated;
