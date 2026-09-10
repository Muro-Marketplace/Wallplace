# Owner runbook: finishing the UK compliance remediation

Written 10 September 2026, after applying migrations 139 to 144 to production.

Everything a code change could do is done and on branch
`claude/wallplace-uk-compliance-audit-c56bdf`. This is the list that needs a
human, in the order it has to happen.

**Steps 1 and 2 are a pair.** Doing them out of order takes live surfaces
offline. That is the only genuinely dangerous thing left here.

---

## Step 1. Deploy the branch

```bash
gh auth switch --user fcoles2598
gh pr create --fill --base main --head claude/wallplace-uk-compliance-audit-c56bdf
gh pr merge --auto --squash
```

`npm run check` is green. `main` requires the "lint + typecheck + unit" check,
so `--auto` merges when it passes. Do not sit watching CI.

**Why this is today's job and not this week's:** it carries `next@16.3.4`,
which closes GHSA-2xp9-vwfh-vxw4, an unauthenticated remote code execution in
the image optimiser reachable through AVIF. Production is on 16.2.1 right now.

It also brings two things step 2 depends on: the signed-URL reads for storage,
and four routes moved off the anon client.

**Nothing breaks between step 1 and step 2.** The new signed reads work fine
against a still-public bucket, and the old INSERT policies are still in place.
That gap is deliberate, and you can leave it as long as you like.

## Step 2. Migration 145, and only after step 1

Apply `supabase/migrations/145_post_deploy_lockdown.sql`.

It does two things, and each one breaks a live surface if run before the
deploy:

1. **Privatises `message-attachments` and `wall-renders`.** Run early and every
   wall-visualiser preview 404s, because production reads them through
   `getPublicUrl()`.
2. **Drops the four always-true anon INSERT policies** on
   `contact_submissions`, `enquiries`, `venue_registrations` and
   `waitlist_signups`. Run early and the waitlist, the contact form, venue
   registration and artist enquiries all stop accepting submissions, because
   until the deploy those routes insert with the anon client.

**Verify afterwards, two minutes:**

- Open the wall visualiser and confirm a preview image loads.
- Submit the contact form once and confirm it succeeds.

**Rollback**, if you revert the deploy: set `public = true` on both buckets, and
recreate the four policies as `WITH CHECK (true)` for `anon`. Nothing in 139 to
144 needs undoing; all of it is safe against either version of the code, which
is why it was split this way.

## Step 3. Configuration, about 40 minutes

### Five environment variables in Vercel

| Variable | Where to get it | What it does today without it |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Create a free Upstash Redis database | Rate limiting falls back to a per-instance memory map. The code's own warning: "this provides NO protection in production" |
| `UPSTASH_REDIS_REST_TOKEN` | Same | Same |
| `RESEND_WEBHOOK_SECRET` | The signing secret of the endpoint you create below | Nothing records a spam complaint or a hard bounce. `email_suppressions` has zero rows |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile, free | The signup bot challenge never renders |
| `TURNSTILE_SECRET_KEY` | Same | Same |

Redeploy after setting them, then confirm the `[rate-limit]` warning has
stopped appearing in the Vercel runtime logs. That is how you know it took.

### Resend webhook

Add an endpoint at `https://www.wallplace.co.uk/api/webhooks/resend` with
`email.delivered`, `email.bounced` and `email.complained` enabled. Paste its
signing secret into `RESEND_WEBHOOK_SECRET`.

Until this exists, a recipient who marks a Wallplace email as spam keeps
receiving them. That is the single clearest evidential fact an ICO investigator
looks for on a marketing complaint.

### Supabase leaked-password protection

Dashboard, Authentication, Policies. One toggle. It checks new passwords
against HaveIBeenPwned.

### MFA on the admin account

That account can read every table and approve Stripe refunds. Admin account
takeover is the highest-impact single event available against this platform.

### ICO registration

[ico.org.uk](https://ico.org.uk), take the fee self-assessment, register.
**Tier 1, £52 a year** on turnover under £632,000 and fewer than 10 staff. No
exemption applies, because the processing is for commerce and marketing rather
than solely core business administration.

This is strict liability. The ICO issues these penalties in batches and
publishes the names.

## Step 4. Answers only you have

- **Your Supabase plan tier**, and with it whether point-in-time recovery is
  enabled. Availability is an Article 32(1)(c) measure and the answer is
  currently unknown. On the free tier there is no PITR.
- **The Vercel and Resend data processing agreements.** Confirm both are
  executed and file them. That is all that remains of the international
  transfers finding, now that the functions are confirmed running in Dublin
  (`x-vercel-id: lhr1::dub1::`, checked live).
- **Read the two Online Safety Act assessments** in this directory. They are
  records of your judgement about your own service. I wrote them from the code
  and they need your eyes before they are genuinely yours.
- **Send the Legal Review Pack to a solicitor.** Seven questions. Start with
  LR-1, for the reason below.

## The one finding that got sharper when the migration ran

Backfilling `artist_profiles.trader_status` from the applications gave:

| Declared | Count |
|---|---|
| Private individual (consumer) | 11 |
| Business (trader) | 0 |
| No answer on file | 6 |

The Terms and the Returns page tell every buyer they have a 14-day right to
cancel. That right binds a **trader** selling to a consumer and does not apply
to a private sale between two consumers.

So on the declarations currently on file, most of the catalogue is sold by
people for whom that statement is not true. Either buyers are being told they
have a right they do not have, or Wallplace has assumed the trader's
obligations itself. Which of the two, and what to do about it, is question LR-1
and it is now about most of your artists rather than a hypothetical one.

The listing page already discloses the three states honestly, including "not
confirmed", so nobody is being actively misled from today. The question is what
the commercial answer should be.

## What was applied on 10 September 2026

Migrations 139 to 144, verified against the live schema afterwards rather than
trusting the success flags:

- `139` `reports` client grants revoked
- `140` bucket size and MIME caps, folder-owned upload policies, owner-read on
  the two buckets 145 will close
- `141` marketing consent defaults to false, both existing rows corrected. The
  one genuine newsletter double opt-in was left alone
- `142` `terms_acceptances.age_confirmed`
- `143` collections foreign key to CASCADE, venue PII and Stripe identifiers
  revoked from `anon` and `authenticated`, artist coordinates rounded to 2dp
  behind a trigger
- `144` `artist_profiles.trader_status` CHECK and backfill

A pre-migration snapshot of everything they touch was taken first. The live
site was smoke-tested after: homepage, browse, spaces, contact and the public
stats API all 200, artwork images still serving, wall renders still public as
intended until step 2.
