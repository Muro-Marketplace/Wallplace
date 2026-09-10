# UK Compliance Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every code-fixable finding from the 10 September 2026 UK legal and compliance audit, so Wallplace can scale without a material data-protection, PECR, Online Safety Act or consumer-law defect.

**Architecture:** Six waves, each independently deployable. Wave A closes the reachable RCE path and the storage exposures. Wave B fixes the PECR marketing defaults and adds the age gate. Wave C completes erasure, export and retention. Wave D adds the Online Safety Act surfaces and records. Wave E corrects the legal pages. Wave F is polish. Database changes go in numbered migrations from 140 upward; production is currently at 138 and the repo at 139.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (Postgres 17, Auth, Storage), Stripe, Resend, Zod, Vitest, Playwright.

## Global Constraints

- Public-facing copy: no em dashes, no en dashes, no `&mdash;`/`&ndash;`, no double hyphens as dashes. Rewrite with commas, full stops, "to" and "and".
- Migration filenames: `NNN_lower_snake.sql`, each number used once, header's first line number must match the filename. Enforced by `tests/integration/migration-numbering.test.ts`.
- New trigger functions need `SET search_path = ''` and `REVOKE EXECUTE`, or the Supabase security linter flags them.
- A column mirroring a computed value must be written by a trigger or a cron listed in `vercel.json`. Never by a manual admin endpoint.
- Every new function or route gets tests in the same commit.
- `npm run check` (lint, typecheck, unit, allowlist, depcheck, email render, email audit) must pass before the final commit.
- Do not modify production data. Migrations are written to files; applying them to production is an owner action.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/140_storage_hardening.sql` | Bucket MIME/size caps, folder-ownership upload policies, private message-attachments and wall-renders |
| `supabase/migrations/141_marketing_consent_defaults.sql` | Email preference defaults to opt-out for the news stream |
| `supabase/migrations/142_erasure_and_grants.sql` | Collections FK cascade, venue Stripe column grants, drop duplicate anon INSERT policies |
| `supabase/migrations/143_report_reasons_illegal_content.sql` | Widen the reports reason check constraint |
| `src/lib/storage-refs.ts` | Parse and build storage object references; one place that knows the URL shape |
| `src/app/api/messages/attachments/sign/route.ts` | Party-checked signed URL for a message attachment |
| `src/lib/visualizer/renders-db.ts` | Signed render URLs instead of public ones |
| `src/lib/email/send.ts` | Fail closed for the news stream when no preference row exists |
| `src/lib/account-erasure.ts` | Shared storage-object sweep used by both delete routes |
| `src/app/api/cron/retention/route.ts` | Nightly enforcement of the retention schedule |
| `src/lib/retention.ts` | The retention schedule as data, so the cron and the docs cannot drift |
| `src/components/AgeAndMarketingConsent.tsx` | The 18+ confirmation and marketing opt-in used by all three signup forms |
| `src/app/(pages)/acceptable-use/page.tsx` | Acceptable Use and Content Standards, satisfying OSA s.10 |
| `src/app/(pages)/accessibility/page.tsx` | Accessibility statement |
| `docs/compliance/osa-illegal-content-risk-assessment.md` | OSA s.9 record |
| `docs/compliance/osa-childrens-access-assessment.md` | OSA s.36 record |
| `docs/compliance/retention-schedule.md` | Art 5(1)(e) record, mirrors `src/lib/retention.ts` |
| `docs/compliance/record-of-processing.md` | Art 30 record |

---

## Wave A: close the reachable RCE path and the storage exposures

### Task A1: Upgrade Next.js and sharp

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: nothing
- Produces: `next >= 16.3.4`, `sharp >= 0.35.4` for every later task

- [ ] **Step 1: Record the current advisory count**

```bash
cd website && npm audit --omit=dev 2>/dev/null | tail -3
```
Expected: `10 vulnerabilities (5 moderate, 4 high, 1 critical)`

- [ ] **Step 2: Upgrade**

```bash
cd website && npm i next@^16.3.4 sharp@^0.35.4
```

- [ ] **Step 3: Verify the critical advisory is gone**

```bash
cd website && npm audit --omit=dev 2>/dev/null | tail -3
```
Expected: no `critical`, and GHSA-2xp9-vwfh-vxw4 absent.

- [ ] **Step 4: Run the gate**

```bash
cd website && npm run typecheck && npm run test
```
Expected: PASS. If Next's typegen complains about `.next/types`, run `npx next typegen` first (worktrees inherit a stale `.next`).

- [ ] **Step 5: Commit**

```bash
git add website/package.json website/package-lock.json
git commit -m "fix(security): upgrade next and sharp to clear the AVIF image-optimiser RCE advisory"
```

---

### Task A2: Storage hardening migration

**Files:**
- Create: `supabase/migrations/140_storage_hardening.sql`
- Create: `tests/integration/storage-hardening.test.ts`

**Interfaces:**
- Produces: `message-attachments` and `wall-renders` are private buckets; `artworks` and `avatars` reject non-images and files over 10MB; every bucket's INSERT policy requires the first path segment to equal `auth.uid()`.

- [ ] **Step 1: Write the migration**

```sql
-- 140_storage_hardening.sql
--
-- UK compliance audit, 10 September 2026, findings SEC-1, SEC-9 and SEC-10.
--
-- Three problems, one file.
--
-- 1. `artworks` and `avatars` carry an INSERT policy whose whole WITH CHECK is
--    `bucket_id = 'artworks'`. Any authenticated user could write any file, of
--    any type, at any size, to any path, including another user's prefix. Both
--    buckets also had NULL `allowed_mime_types` and NULL `file_size_limit`, so
--    the only validation was client-side in src/lib/upload.ts, which a direct
--    call to the storage API skips entirely.
--
--    That is what made the Next.js image-optimiser AVIF advisory reachable: the
--    Supabase host is allowlisted in next.config.ts `remotePatterns`, so a
--    crafted file uploaded here could be fed to /_next/image. Task A1 patched
--    the optimiser; this closes the delivery path.
--
-- 2. `message-attachments` is a PUBLIC bucket. Every file sent inside a private
--    conversation is world-readable at a stable unauthenticated URL forever.
--    Migration 070 dropped the SELECT policy, which does nothing while the
--    bucket's own `public` flag is true.
--
-- 3. `wall-renders` is public and holds composites built from `wall-photos`,
--    which is correctly private. The privacy control on the source was undone
--    by the derivative.
--
-- Reads move to short-lived signed URLs. See src/app/api/messages/attachments/
-- sign/route.ts and src/lib/visualizer/renders-db.ts.

-- ── 1. Bucket-level type and size caps ──────────────────────────────────
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
 where id in ('artworks', 'avatars', 'collections');

update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array['image/png','image/jpeg','image/webp']
 where id = 'wall-photos';

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/webp','image/png','image/jpeg']
 where id = 'wall-renders';

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['application/pdf','image/png','image/jpeg']
 where id = 'contracts';

-- ── 2. Private the two leaking buckets ──────────────────────────────────
update storage.buckets set public = false
 where id in ('message-attachments', 'wall-renders');

-- ── 3. Folder-ownership on every client-writable bucket ─────────────────
-- The path convention everywhere in src/lib/upload.ts is `${user.id}/<file>`.
drop policy if exists "Authenticated users can upload artworks" on storage.objects;
create policy "artworks_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- `collections` already had the ownership check but granted it to `public`,
-- which includes `anon`. Narrow to authenticated and wrap the auth call.
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

-- Owners may delete their own artwork and avatar files. Without this the
-- erasure sweep in src/lib/account-erasure.ts can only run as service role,
-- which is what it does, but a user tidying their own portfolio could not.
drop policy if exists "artworks_owner_delete" on storage.objects;
create policy "artworks_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Write a test that locks the intent**

```ts
// tests/integration/storage-hardening.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  path.resolve(here, "../../supabase/migrations/140_storage_hardening.sql"),
  "utf8",
);

describe("140_storage_hardening", () => {
  it("makes message-attachments and wall-renders private", () => {
    expect(sql).toMatch(/set public = false[\s\S]*message-attachments[\s\S]*wall-renders/);
  });

  it("gives every client-writable bucket a folder-ownership INSERT check", () => {
    for (const bucket of ["artworks", "avatars", "collections"]) {
      const policy = new RegExp(
        `bucket_id = '${bucket}'\\s*\\n\\s*and \\(storage\\.foldername\\(name\\)\\)\\[1\\] = \\(select auth\\.uid\\(\\)\\)::text`,
      );
      expect(sql, `${bucket} lacks a folder-ownership check`).toMatch(policy);
    }
  });

  it("caps type and size on every bucket", () => {
    for (const bucket of ["artworks", "avatars", "collections", "wall-photos", "wall-renders", "contracts"]) {
      expect(sql, `${bucket} has no allowed_mime_types`).toContain(bucket);
    }
    expect(sql).not.toMatch(/allowed_mime_types\s*=\s*null/i);
  });
});
```

- [ ] **Step 3: Run the test**

```bash
cd website && npx vitest run tests/integration/storage-hardening.test.ts
```
Expected: PASS (the migration file already exists from Step 1).

- [ ] **Step 4: Commit**

```bash
git add website/supabase/migrations/140_storage_hardening.sql website/tests/integration/storage-hardening.test.ts
git commit -m "fix(security): cap storage uploads by type and size, own the upload path, private the two leaking buckets"
```

---

### Task A3: Signed reads for message attachments and wall renders

**Files:**
- Create: `src/lib/storage-refs.ts`, `src/lib/storage-refs.test.ts`
- Create: `src/app/api/messages/attachments/sign/route.ts`
- Modify: `src/lib/visualizer/renders-db.ts`, `src/lib/upload.ts`, `src/components/MessageInbox.tsx`
- Modify: the four render callers listed in the file structure table

**Interfaces:**
- Consumes: private buckets from Task A2
- Produces:
  - `objectPathFromPublicUrl(url: string, bucket: string): string | null`
  - `signedUrlFor(bucket: string, path: string, ttlSeconds?: number): Promise<string | null>`
  - `getRenderUrl(path: string): Promise<string>` replacing `getPublicRenderUrl`
  - `POST /api/messages/attachments/sign` taking `{ messageId: string, url: string }` and returning `{ signedUrl }`

Full code is in the implementation; the shape above is what later tasks may rely on.

- [ ] **Step 1: Write `src/lib/storage-refs.test.ts` covering a public URL, a bare path, a foreign bucket and a malformed value**
- [ ] **Step 2: Run it, confirm it fails**
- [ ] **Step 3: Implement `src/lib/storage-refs.ts`**
- [ ] **Step 4: Run it, confirm it passes**
- [ ] **Step 5: Add the sign route with a party check on `messages.sender_id` or `messages.recipient_user_id`**
- [ ] **Step 6: Repoint `renders-db.ts` and its four callers at signed URLs**
- [ ] **Step 7: Repoint `MessageInbox.tsx` attachment rendering at the sign route**
- [ ] **Step 8: `npm run typecheck && npm run test`, then commit**

---

## Wave B: PECR marketing consent and the age gate

### Task B1: Marketing defaults and fail-closed sending

**Files:**
- Create: `supabase/migrations/141_marketing_consent_defaults.sql`
- Modify: `src/lib/email/send.ts`, `src/lib/email/send.test.ts`

**Interfaces:**
- Produces: no news-stream email sends to a user who has not opted in, whether or not an `email_preferences` row exists.

**Why the migration alone is not enough:** `send.ts` step 3 reads `email_preferences` and, when the row is absent, falls through and sends. `get_email_preferences()` only creates the row lazily. So flipping the column default fixes new rows and does nothing for the users who have no row, which is most of them.

- [ ] **Step 1: Write the failing test**

```ts
it("does not send a news-stream email when the user has no preference row", async () => {
  prefsRow = null; // maybeSingle() returns { data: null }
  const result = await sendEmail({
    idempotencyKey: "k1",
    template: "artist_inactive_30d",
    category: "tips",
    to: "a@example.com",
    userId: "u1",
    subject: "s",
    react: <div />,
  });
  expect(result).toEqual({ ok: true, skipped: true, reason: "opted_out" });
});

it("still sends a relational notify-stream email when the user has no preference row", async () => {
  prefsRow = null;
  const result = await sendEmail({
    idempotencyKey: "k2",
    template: "placement_request",
    category: "placements",
    to: "a@example.com",
    userId: "u1",
    subject: "s",
    react: <div />,
  });
  expect(result).not.toMatchObject({ skipped: true, reason: "opted_out" });
});
```

- [ ] **Step 2: Run it, confirm the first fails**
- [ ] **Step 3: Implement the fail-closed branch in `send.ts`**

```ts
// 3. User preferences, opt-out + vacation mode + category toggle.
if (!rules.criticalAlwaysSend && input.userId) {
  const { data: prefs } = await db
    .from("email_preferences")
    .select("*")
    .eq("user_id", input.userId)
    .maybeSingle();

  // UK compliance audit, finding MKT-1. PECR reg 22 needs consent for the
  // news stream, and soft opt-in is unavailable to a venue on a free account
  // or a customer who never bought. `get_email_preferences()` creates the row
  // lazily, so most users have no row at all and this block used to fall
  // through and send. Absence of a row is now absence of consent.
  if (!prefs && rules.stream === "news") {
    await logEvent(db, input, to, rules.stream, "skipped_opted_out", eventMetadata);
    return { ok: true, skipped: true, reason: "opted_out" };
  }

  if (prefs) { /* unchanged */ }
}
```

- [ ] **Step 4: Run the tests, confirm both pass**
- [ ] **Step 5: Write the migration**

```sql
-- 141_marketing_consent_defaults.sql
--
-- UK compliance audit, 10 September 2026, finding MKT-1.
--
-- `tips_enabled` and `recommendations_enabled` defaulted to true. Those two
-- categories carry the re-engagement campaigns (venue_inactive_90d_white_glove,
-- customer_inactive_30d, artist_inactive_*) and the artist and venue match
-- emails. Those are direct marketing under PECR reg 22.
--
-- Soft opt-in under reg 22(3) needs contact details obtained in the course of
-- a sale or negotiations for a sale, AND an opportunity to refuse at the point
-- of collection. A venue registers free and a customer may never buy, so the
-- first limb fails for them; no signup form offered a refusal, so the second
-- limb failed for everyone. Consent is therefore required and the default must
-- be off.
--
-- The onboarding nudges stay where they are. They help a user finish something
-- they started, which is a service message, not marketing.

alter table public.email_preferences
  alter column tips_enabled set default false,
  alter column recommendations_enabled set default false;

-- Existing rows were never a record of consent: nothing ever asked. Two rows
-- exist in production and both predate any consent capture.
update public.email_preferences
   set tips_enabled = false,
       recommendations_enabled = false,
       updated_at = now()
 where tips_enabled is true
    or recommendations_enabled is true;

comment on column public.email_preferences.tips_enabled is
  'PECR reg 22 consent for the news stream. Defaults false. Set true only by an affirmative opt-in.';
comment on column public.email_preferences.recommendations_enabled is
  'PECR reg 22 consent for match and recommendation email. Defaults false. Set true only by an affirmative opt-in.';

notify pgrst, 'reload schema';
```

- [ ] **Step 6: Commit**

```bash
git add website/supabase/migrations/141_marketing_consent_defaults.sql website/src/lib/email/send.ts website/src/lib/email/send.test.ts
git commit -m "fix(pecr): treat a missing preference row as absence of consent for the news stream"
```

---

### Task B2: Age confirmation and marketing opt-in at signup

**Files:**
- Create: `src/components/AgeAndMarketingConsent.tsx`, `src/components/AgeAndMarketingConsent.test.tsx`
- Modify: `src/app/(pages)/signup/artist/page.tsx`, `signup/venue/page.tsx`, `signup/customer/page.tsx`
- Modify: `src/lib/validations.ts` (`termsAcceptSchema`), `src/app/api/terms/accept/route.ts`
- Modify: `src/app/api/account/preferences/route.ts` or add the opt-in write to the signup flow

**Interfaces:**
- Produces: `<AgeAndMarketingConsent ageConfirmed marketingOptIn onAgeChange onMarketingChange />`; `terms_acceptances.age_confirmed boolean`

- [ ] **Step 1: Write the component test** (renders both controls, marketing unticked by default, age required)
- [ ] **Step 2: Run it, confirm it fails**
- [ ] **Step 3: Implement the component**
- [ ] **Step 4: Run it, confirm it passes**
- [ ] **Step 5: Wire into all three signup forms, gating the submit button on `ageConfirmed`**
- [ ] **Step 6: Extend `termsAcceptSchema` with `ageConfirmed: z.boolean()` and persist it**
- [ ] **Step 7: Write `supabase/migrations/142_age_confirmation.sql` adding `terms_acceptances.age_confirmed boolean`**
- [ ] **Step 8: `npm run test`, then commit**

---

## Wave C: erasure, export and retention

### Task C1: Erasure and grants migration

**Files:**
- Create: `supabase/migrations/143_erasure_and_grants.sql`

Covers: `artist_collections_artist_id_fkey` to `ON DELETE CASCADE`; revoke the three Stripe identifier columns on `venue_profiles` from `anon` and `authenticated` using the 076 pattern; drop the duplicate always-true anon INSERT policies on `contact_submissions`, `enquiries`, `venue_registrations` and `waitlist_signups`; round `artist_profiles.lat`/`lng` to 2dp on write with a trigger carrying `SET search_path = ''` and a `REVOKE EXECUTE`.

- [ ] **Step 1: Write the migration**
- [ ] **Step 2: Extend `tests/integration/rls-gap-closure.test.ts` or add a sibling that asserts the four policy drops appear**
- [ ] **Step 3: Run the test, commit**

### Task C2: Complete the erasure sweep

**Files:**
- Create: `src/lib/account-erasure.ts`, `src/lib/account-erasure.test.ts`
- Modify: `src/app/api/account/delete/route.ts`, `src/app/api/account/route.ts`

**Interfaces:**
- Produces: `purgeUserStorage(db, userId): Promise<string[]>` returning failure labels; `ERASURE_TABLES` as the single shared list.

- [ ] **Step 1: Write the failing test** for `purgeUserStorage` listing and removing `${userId}/` in all seven buckets and collecting rather than throwing on error
- [ ] **Step 2: Run it, confirm it fails**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run it, confirm it passes**
- [ ] **Step 5: Add the nine missing tables to the shared list and call the sweep from both routes**
- [ ] **Step 6: Commit**

### Task C3: Complete the data export

**Files:** Modify `src/app/api/account/export/route.ts` and its test.

Add: blogs, purchase_offers (both sides), artwork_requests, artwork_request_responses, commissions, disputes, reports, feature_requests, walls, wall_layouts, wall_renders, visualizer_usage, curation_requests, email_events, order_events, conversation_reports, user_blocks, cart_sessions, artist_referrals, placement_reviews, stripe_transfers, contact_submissions, venue_registrations.

### Task C4: Retention schedule and cron

**Files:**
- Create: `src/lib/retention.ts`, `src/lib/retention.test.ts`, `src/app/api/cron/retention/route.ts`, `docs/compliance/retention-schedule.md`
- Modify: `vercel.json`

**Interfaces:**
- Produces: `RETENTION_RULES: ReadonlyArray<{ table: string; column: string; days: number; action: "delete" | "anonymise"; rationale: string }>`

Per the data invariant in AGENTS.md, this must be a cron listed in `vercel.json`, never a manual admin endpoint.

---

## Wave D: Online Safety Act

### Task D1: Illegal-content report categories

**Files:**
- Modify: `src/lib/validations.ts` (`REPORT_REASONS`), `src/components/ReportContentButton.tsx`, `src/app/api/reports/route.ts`
- Create: `supabase/migrations/144_report_reasons_illegal_content.sql`

Add: `harassment_or_threats`, `hate_or_discrimination`, `illegal_or_harmful_sexual_content`, `self_harm_or_suicide`, `fraud_or_illegal_goods`. Route those five to an immediate admin alert with an `urgent: true` flag rather than the ordinary queue.

### Task D2: Acceptable Use and Content Standards page

**Files:** Create `src/app/(pages)/acceptable-use/page.tsx`; modify `src/components/Footer.tsx` and `src/app/(pages)/terms/page.tsx` to link it.

### Task D3: The two OSA records

**Files:** Create `docs/compliance/osa-illegal-content-risk-assessment.md` and `docs/compliance/osa-childrens-access-assessment.md`, following Ofcom's risk assessment guidance structure: service description, user base, functionalities, each of the 17 kinds of priority illegal content with a likelihood and impact rating, existing controls, residual risk, measures adopted, review trigger and date.

---

## Wave E: legal pages

- **E1** Paid-ranking disclosure on `/browse` and in the venue digest template.
- **E2** `/returns` corrections: refund deadline runs from evidence of dispatch, outbound delivery cost refunded, drop the 48-hour bar as a requirement.
- **E3** `/terms`: carve consumers out of s.10A, cap the s.13 indemnity, give a right to exit on variation in s.15, update the ADR citation, add OSA illegal-content language, link Acceptable Use.
- **E4** `/privacy`: full rewrite against the audit's data map.
- **E5** Cookie banner becomes a dismissible notice.
- **E6** Artist Agreement s.6: sub-licensing to venues, visualiser composites, post-termination printed material.
- **E7** `/accessibility` statement.

---

## Wave F: polish

- **F1** Surface trader status on the listing page's seller-information block.
- **F2** In-product copyright report route pointing at the IP Policy.

---

## What was applied to production, 10 September 2026

Migrations 139, 140, 141, 142, 143 and 144 are **applied**. Verified after the
fact against the live schema rather than trusting the success flags: preference
defaults are false and both existing rows were corrected (the one genuine
double opt-in on `newsletter_enabled` is untouched), `terms_acceptances.age_confirmed`
and `artist_profiles.trader_status` exist, the collections foreign key reads
CASCADE, coordinates are rounded to 2dp with the trigger in place, `reports`
holds no client grants, the six venue PII and Stripe-identifier columns are
revoked from `anon` and `authenticated`, and every bucket carries a size and
MIME cap with folder-owned upload policies.

A pre-migration snapshot of everything they touch is in the session scratchpad
at `backup-2026-09-10/`.

Two things came out of doing it that were not in the plan:

**The four anon-insert routes.** `api/waitlist`, `api/contact`,
`api/register-venue` and `api/enquiry` each performed their insert with the
ANON client, which is precisely why those tables carried always-true INSERT
policies for anon. Dropping the policies as originally written in 143 would
have taken the waitlist, the contact form, venue registration and artist
enquiries offline. All four are switched to the service-role client, and the
drops moved to 145.

**Migration 145 is the post-deploy step.** It holds the two things that break
production if applied before the branch is live: privatising
`message-attachments` and `wall-renders`, and dropping those four INSERT
policies. Everything in 139 to 144 is safe against either version of the code,
which is the property the split was for.

**`artist_profiles.trader_status` already existed** at ordinal 73, added out of
band alongside `business_name`, `vat_number` and `hear_about`. The migration's
`add column if not exists` was a no-op on the column; what it actually did was
add the CHECK constraint and run the backfill. The committed schema snapshot
had drifted by six columns on that table and one on `terms_acceptances`, and is
now regenerated.

## Owner actions this plan cannot do

| Action | Why the code cannot |
|---|---|
| ~~Apply migrations 139 to 144~~ | **Done, 10 September 2026.** Migration **145** is the one still to run, and it must go AFTER the deploy |
| Set `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Vercel environment |
| Set `RESEND_WEBHOOK_SECRET` and configure the Resend endpoint | Vercel and Resend dashboards |
| Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Vercel and Cloudflare |
| Move the function region off `iad1`, or execute Vercel's DPA and write the transfer risk assessment | Vercel account and a commercial decision |
| Enable Supabase leaked-password protection | Dashboard toggle |
| Enrol MFA on the admin account | Human |
| Register and pay the ICO data protection fee | Human, 15 minutes, tier 1 at £52 |
| Confirm the Supabase plan tier and point-in-time recovery | Dashboard |
| The seven questions in the audit's Legal Review Pack | Qualified UK solicitor |
