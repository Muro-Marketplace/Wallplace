-- 141_marketing_consent_defaults.sql
--
-- UK compliance audit, 10 September 2026, finding MKT-1.
--
-- `tips_enabled` and `recommendations_enabled` defaulted to true. Those two
-- categories carry direct marketing:
--
--   tips            -> the re-engagement campaigns. venue_inactive_30d,
--                      venue_inactive_90d_white_glove, customer_inactive_30d,
--                      customer_inactive_90d, artist_inactive_14d/30d/90d.
--   recommendations -> artist and venue match emails, new works from artists
--                      the recipient follows.
--
-- PECR reg 22 requires consent for unsolicited direct marketing by email.
-- The soft opt-in in reg 22(3) does not rescue this, on either limb:
--
--   (a) the contact details must have been obtained "in the course of the sale
--       or negotiations for the sale" of a product or service to that
--       recipient. A venue registers free and never negotiates a sale, and a
--       browsing customer may never buy. For those two roles the limb simply
--       is not met.
--   (b) the recipient must have been given a simple means of refusing at the
--       time the details were collected. No signup form offered one, so this
--       limb failed for every role including paying artists.
--
-- So the default must be off, and consent has to be captured explicitly. The
-- signup forms now carry an unticked opt-in (see AgeAndMarketingConsent.tsx)
-- and write these two columns through /api/account/preferences.
--
-- The onboarding nudges stay exactly where they are, in the same `tips`
-- category but sent to users who asked for the thing they are being nudged
-- to finish. They are service messages about a task the user started. If that
-- distinction ever stops holding, they should move category rather than have
-- this default relaxed.
--
-- Flipping the default here is necessary and NOT sufficient:
-- `get_email_preferences()` creates the row lazily, so most users have no row
-- at all and never meet this default. src/lib/email/send.ts now treats a
-- missing row as absence of consent for the news stream. Both halves are
-- needed; either alone leaves the hole open.

alter table public.email_preferences
  alter column tips_enabled set default false,
  alter column recommendations_enabled set default false;

-- Existing rows are not a record of consent, because nothing ever asked. Two
-- rows exist in production and both predate any consent capture, so this is a
-- correction rather than a withdrawal of something a user chose.
update public.email_preferences
   set tips_enabled = false,
       recommendations_enabled = false,
       updated_at = now()
 where tips_enabled is true
    or recommendations_enabled is true;

comment on column public.email_preferences.tips_enabled is
  'PECR reg 22 consent for the news stream (re-engagement, product tips). Defaults false. Set true only by an affirmative opt-in the user made.';

comment on column public.email_preferences.recommendations_enabled is
  'PECR reg 22 consent for match and recommendation email. Defaults false. Set true only by an affirmative opt-in the user made.';

comment on column public.email_preferences.newsletter_enabled is
  'PECR reg 22 consent for the newsletter. Defaults false, set true only by the double opt-in confirmation in /api/newsletter/confirm.';

comment on column public.email_preferences.promotions_enabled is
  'PECR reg 22 consent for promotional offers. Defaults false.';

notify pgrst, 'reload schema';
