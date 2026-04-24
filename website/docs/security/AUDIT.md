# Wallplace — security & testing audit

**Produced:** 24 April 2026
**Scope:** codebase-wide review of a Next.js 16 + Supabase + Stripe marketplace
with 64 API routes, 31 migrations, and zero tests.

---

## 0. Environment snapshot

| Facet | Status |
|---|---|
| Framework | Next.js 16 (App Router, RSC + API routes) |
| Auth | Supabase Auth (JWT in `Authorization: Bearer` header to API) |
| DB | Supabase Postgres via `@supabase/supabase-js`. Client in two forms: `supabase` (anon, client-side) and `getSupabaseAdmin()` (service-role, server only) |
| Storage | Supabase Storage, buckets: `avatars`, `artworks`, `collections`, `contracts` — **all public** via `getPublicUrl` |
| Payments | Stripe one-time (cart checkout) + Stripe subscriptions + Stripe Connect transfers |
| Webhooks | `/api/webhooks/stripe` with `stripe.webhooks.constructEvent` signature check ✅ |
| Route guards | `getAuthenticatedUser()` helper per-route; no `middleware.ts` |
| Admin gate | `getAdminUser()` env-list `ADMIN_EMAILS` |
| Rate limiting | `checkRateLimit()` — **in-memory per instance**, not durable on serverless |
| Moderation | `moderateMessage()` — regex block/flag list |
| Validation | `zod` schemas in `src/lib/validations.ts` (~176 lines) — coverage is partial |
| Tests | **None** |
| CI | **None** (no `.github/workflows`, no test script in `package.json`) |
| Security headers | **None** (no custom headers in `next.config.ts`) |
| Content sanitisation | None on user-generated content beyond moderation |
| Middleware | None |

### API route coverage

- 64 route files total
- 14 routes with no auth helper AND no signature check. Of these:
  - 6 are cron routes (protected by `CRON_SECRET` via a shared helper — OK)
  - `/api/checkout` + `/api/checkout/session` — guest checkout, need rate limits
  - `/api/browse-collections`, `/api/venues/[slug]`, `/api/collections/[id]` — public read endpoints (fine if data is meant to be public)
  - `/api/qr/[slug]` — public scan endpoint (fine)
  - **`/api/stripe-connect/process-pending` — protected by `CRON_SECRET` ONLY if env is set; fails OPEN if unset.** High-risk.
  - `/api/curation/route.ts` — needs review

### RLS coverage (critical finding)

Tables with RLS enabled in migrations (17): `analytics_events`,
`artist_collections`, `artist_referrals`, `curation_requests`,
`email_events`, `email_preferences`, `email_suppressions`,
`featured_artists`, `newsletter_subscribers`, `notifications`,
`placement_archives`, `placement_photos`, `placement_records`,
`refund_requests`, `saved_items`, `stripe_transfers`, `terms_acceptances`.

**Tables with NO RLS visible in migrations** (the core data tables):
`artist_profiles`, `venue_profiles`, `artist_works`, `placements`,
`messages` (partially — policies for SELECT/UPDATE but INSERT/DELETE
left open), `orders`, `artist_applications`, `conversations`,
`reviews`, `admin_users`, `email_events` (has RLS but needs audit).

**Risk:** if these tables are in the `public` schema with Supabase's
default `anon` SELECT grant and no RLS, an attacker with the public anon
key can `supabase.from('orders').select('*')` from the browser and pull
every order on the platform. **Verify this in the Supabase dashboard
before any public launch.**

---

## Part 1 — security audit

### A. Authentication & session security

| Area | Current state | Risk | Fix | Priority | Tests |
|---|---|---|---|---|---|
| Signup | Supabase email+password. No custom rate limit beyond Supabase's built-in. | Medium | Add per-IP and per-email throttles; CAPTCHA on signup form. | P1 | Unit + Playwright |
| Login | Supabase `signInWithPassword` client-side. | Medium | CAPTCHA on 3+ failed attempts; enumeration-safe error messages. | P1 | Playwright |
| Logout | Supabase `signOut`. | Low | — | — | Playwright smoke |
| Email verification | Supabase hosted (template not customised). No custom handler. | Low (Supabase-handled) | Style template per `AccountEmailVerification`. | P2 | — |
| Password reset | Supabase hosted. | Low | Same — customise template. | P2 | — |
| Session handling | JWT in `Authorization` header, passed from client. No server-side session store. | Low | Ensure no session id is logged. | P3 | — |
| Protected routes | Per-route `getAuthenticatedUser()`. No middleware. | Medium | Move cross-cutting checks to `middleware.ts`; API routes still verify. | P1 | Integration |
| Role/persona handling | Derived at call-time via `artist_profiles`/`venue_profiles` lookup. Not a JWT claim. | Medium | Cache in a helper; consider storing `user_type` in Supabase user_metadata. | P2 | Unit |
| Admin access | `ADMIN_EMAILS` env. Falls closed if unset (good). | Low | Rotate quarterly; log every admin action. | P1 | Integration |
| Account deletion | Not implemented (template exists). | Medium | Build deletion flow + retention policy. | P2 | Integration |
| Data export | Not implemented (template exists). | Medium | GDPR DSR implementation. | P2 | — |
| Suspicious login | Not implemented. | Low | Hook Supabase auth events → send `account_suspicious_login`. | P3 | — |

**Verdict:** baseline is OK because Supabase handles the hardest parts.
Gaps are on the Wallplace-specific wrappers — rate limits, admin
auditing, persona inference caching.

### B. Authorisation & permissions

Every API handler that mutates a resource needs to prove the caller has
the right to mutate THAT specific row. Current pattern is
per-route inline checks — easy to miss a case. Sample audit:

#### Sampled routes (spot-check)

| Route | Ownership check | Status |
|---|---|---|
| `PATCH /api/placements` | Loads placement, checks `artist_user_id === user.id \|\| venue_user_id === user.id` | ✅ |
| `PUT /api/placements/[id]/record` | Loads placement, same ownership check | ✅ |
| `PUT /api/admin/applications/[id]` | `getAdminUser()` | ✅ |
| `POST /api/refunds/process` | Checks artist ownership OR admin | ✅ |
| `POST /api/messages` | Auth required, recipient slug from body | ⚠️ — doesn't verify sender profile slug matches their own user id |
| `PATCH /api/placements` (counter path) | Role inference from message trail | ⚠️ — complex fallback logic, needs unit coverage |
| `POST /api/placements` | Creates placement with `requester_user_id: auth.user.id` | ✅ |
| `POST /api/checkout` | No auth | ⚠️ — guest checkout is OK but rate-limit absent |
| `POST /api/stripe-connect/process-pending` | `CRON_SECRET` optional | 🔴 — fails open if env unset |
| `GET /api/notifications/*` | Needs audit | — |
| `DELETE /api/placements` | Loads placement, ownership check ✅ | ✅ |
| `PATCH /api/artist-works/*` | Needs audit | — |
| `PATCH /api/venue-profile/*` | Needs audit | — |

Every mutation endpoint needs a standard pattern. See §1 recommended helpers.

### C. Server-side validation

Zod schemas cover: waitlist, contact, enquiry, apply, register-venue,
message, placement, placement-update, checkout. Not every API route
uses them. Sample gaps:

- Placement record PUT has its own inline schema (OK, scoped)
- Placement counter nested schema — OK
- Admin applications — no input schema on `action` and `feedback` beyond a string check
- Refund process — body accessed directly with no schema
- Notifications PATCH — no schema
- Profile updates (artist/venue) — need audit

**Rule:** every `body = await request.json()` must be followed
immediately by a zod `safeParse`. No exceptions.

### D. Database security & RLS

RLS status per core table (migrations-only view):

| Table | RLS? | Policies present? | Exposure risk |
|---|---|---|---|
| `artist_profiles` | ❓ not in migrations | ❓ | 🔴 profile PII readable via anon key if default grant present |
| `venue_profiles` | ❓ | ❓ | 🔴 same |
| `artist_works` | ❓ | ❓ | 🟡 works are meant to be public, but `available` flag + pricing may leak |
| `placements` | ❓ | ❓ | 🔴 private negotiation terms |
| `messages` | ✅ | SELECT + UPDATE for parties only | 🟢 but INSERT/DELETE need explicit policies |
| `orders` | ❓ | ❓ | 🔴 PII + totals |
| `artist_applications` | ❓ | ❓ | 🔴 applicant contact details |
| `reviews` | ❓ | ❓ | 🟡 |
| `notifications` | ✅ | Per-user | 🟢 |
| `refund_requests` | ✅ | Per-requester SELECT/INSERT, updates via service role only | 🟢 |
| `email_events` | ✅ | Need audit for correctness | 🟡 |
| `email_preferences` | ✅ | Per-user | 🟢 |
| `stripe_transfers` | ✅ | Need audit | 🟡 |
| `placement_records` | ✅ | Parties only | 🟢 |
| `saved_items` | ✅ | Per-user | 🟢 |
| `analytics_events` | ✅ | Service-role only | 🟢 |

**Recommended approach (fastest):** enable RLS on every user-data
table + default-deny. Grant SELECT/INSERT/UPDATE/DELETE explicitly via
policies keyed on `auth.uid()`. For tables the server hits via
service-role (which bypasses RLS), default-deny is fine — all client
access is blocked, server access continues.

See §D-matrix below for table-by-table policy recommendations.

### E. Sensitive workflow security

#### Placement workflow
- **Request:** ✅ `POST /api/placements` stamps `requester_user_id`. Rate-limit missing.
- **Accept/decline:** ✅ PATCH checks ownership + `isRequester` gate.
- **Counter:** ⚠️ complex — the current requester is inferred from latest counter message. There's a documented previous bug where the "original offerer" was re-promoted to requester. Needs explicit unit tests for the role-flip matrix.
- **Stage transitions (scheduled/installed/live/collected):** ⚠️ either party can advance any stage with no sequential check. User can jump `pending → collected`? Status check enforces `active` first, but undo/redo is ad-hoc.
- **Consignment record:** ✅ bilateral approval + snapshot + re-approval on content change. Solid.
- **Contract signing:** ✅ same pattern.

**Gaps:** no audit log for stage transitions, no idempotency on the PATCH stage, no transition matrix helper (`canTransition(from, to, role)`).

#### Messaging workflow
- **Send:** ⚠️ `POST /api/messages` — auth'd, but `senderSlug` is taken from the body. Attacker-authenticated-as-A can send as B by passing `senderName: "b-slug"`. **Medium-high risk.**
- **Moderation:** ✅ blocking regex layer.
- **Conversation creation:** ✅ deterministic id.
- **Read:** RLS policy covers. ✅
- **Report / block:** not implemented.

#### Artwork / venue publishing
- Publish/unpublish: direct PATCH on profile. Ownership check needs audit per route.
- Moderation: `review_status` column on `artist_profiles` (manual admin-approval flow). **No AI-content detection.**

#### Payments / orders
- **Webhook signature:** ✅ `stripe.webhooks.constructEvent`
- **Idempotency:** ✅ unique index on `stripe_payment_intent_id` (migration 012)
- **Guest checkout:** ⚠️ no rate limit on `/api/checkout` — an attacker can spam Stripe checkout session creation
- **Stripe Connect transfers:** 14-day hold + `processPendingTransfers` via `/api/stripe-connect/process-pending` — **this route fails open if `CRON_SECRET` isn't set.** 🔴

#### Payouts / subscriptions
- Referral credit: ✅ guarded by `referral_credited_at` and customer match
- Stripe KYC: ✅ webhook handler added
- Tier caps: not enforced on the server — client-only gate visible in UI. **Medium risk** — user can `POST /api/artist-works` past their cap by hitting the API directly. Needs a server check.

#### Email
- Unsubscribe: template-driven footer, preference centre route not implemented
- Preferences: stored in `email_preferences` with per-user RLS
- Enumeration: signup/login errors should say "If that address exists, we sent you a link" on forgot-password flow (needs audit)

### F. Rate limiting

Current: in-memory `Map` keyed on IP+URL. On Vercel, each cold-started
function instance has its own map — effectively **no protection across
instances.**

**Risk:** real rate limiting is missing for the things that matter
(login, password reset, signup, checkout, messages, reviews, webhook
endpoints have no brute-force protection).

Recommended:
- Move to **Upstash Redis** (free tier, `@upstash/ratelimit`) or
- Supabase edge-functions with a DB-backed counter, or
- Vercel's built-in rate-limiting (paid)

Rules to enforce server-side:

| Endpoint | Limit | Window | Keyed on |
|---|---|---|---|
| Login | 5 | 15 min | IP + email |
| Signup | 3 | 10 min | IP |
| Password reset | 3 | 60 min | IP + email |
| Email verification resend | 3 | 60 min | user_id |
| Message send | 30 | 5 min | user_id |
| Placement request | 10 | 60 min | user_id |
| Checkout session create | 10 | 10 min | IP |
| Review post | 5 | 60 min | user_id |
| File upload | 20 | 60 min | user_id |
| QR scan | 60 | 1 min | IP (don't over-limit scans — legit traffic bursts) |
| Admin actions | 100 | 10 min | admin user_id |
| Webhook | 0 | — | signature required |

### G. File upload & media security

**Current:**
- `uploadImage()` (client-side) — checks MIME + size (10MB cap), uploads with `user.id` prefix, returns **public URL**
- `uploadContract()` — same pattern, also public URL
- All buckets public

**Risks:**
1. 🔴 **Contracts are publicly readable via URL.** Anyone with the URL can read a signed consignment record. These should be private with signed URLs.
2. 🟡 MIME check is client-side only — an attacker can POST arbitrary files directly to Supabase Storage with the anon key if bucket policies allow authenticated uploads.
3. 🟡 No image validation on the server side (dimensions, malware).
4. 🟡 `upsert: false` is good — prevents overwrites — but no cleanup of orphaned uploads.

**Fix plan:**
- Create **private** bucket for contracts + signed URLs with 1h expiry
- Move `uploadImage`/`uploadContract` to server-side with service-role client, or add bucket policies enforcing `auth.uid()::text = (storage.foldername(name))[1]`
- Add MIME re-check on the server
- Consider Cloudflare R2 or Vercel Blob if Supabase Storage costs become a factor

### H. Webhook & background job security

**Stripe webhook:** ✅ signature verified, idempotency per payment_intent.

**Remaining gaps:**
- No dead-letter queue — if a webhook handler throws, Stripe retries up to 3 days but the error only logs to stdout. A single repeated failure goes unnoticed.
- No alerting hook.
- Cron routes: ✅ guarded by `requireCronAuth()` that fails closed in production.
- No Inngest / QStash yet — nothing to audit.

### I. Secrets & environment security

**Public (`NEXT_PUBLIC_*`) vars exposed to the browser — confirmed shipping publicly:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

**Private (must never hit the client):**
- `SUPABASE_SERVICE_ROLE_KEY` — grep for usage ✅ server-only
- `RESEND_API_KEY` — server-only
- `STRIPE_SECRET_KEY` — server-only
- `STRIPE_WEBHOOK_SECRET` — server-only
- `STRIPE_CONNECT_CLIENT_ID` — server-only
- `CRON_SECRET` — server-only
- `ADMIN_EMAILS` / `ADMIN_EMAIL` — server-only

**No `.env.example` file** — onboarding new devs is guesswork. Fix.

**No runtime env var validation** — missing env vars fail at the first
request to a code path that needs them, not at boot. A tiny `env.ts`
with a zod schema parsed once at module load catches this at deploy time.

### J. App security headers

**Zero custom headers.** `next.config.ts` has `images` config only. Add:

```ts
// next.config.ts
async headers() {
  return [{
    source: "/:path*",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      // CSP — tighten iteratively. Start with report-only.
      { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.resend.com; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com;" },
    ],
  }];
}
```

Cookies: Supabase Auth SDK manages session cookies. Verify:
- `httpOnly` (SDK sets this)
- `Secure` (auto in production)
- `SameSite=Lax` (SDK default)

CSRF: not directly needed for Bearer-token APIs. Verify forms with
side effects either use Bearer or have a CSRF token.

### K. Audit logging

**Current state:** No audit log table. Only `console.log` and `console.error` calls.

**Missing:**
- No record of who changed a placement's stage
- No record of admin actions (restrict, approve, reject)
- No record of refund decisions
- No record of failed auth attempts
- No record of permission denials

**Design:**

```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,                 -- null for anon / system
  actor_role text,                    -- 'artist' | 'venue' | 'customer' | 'admin' | 'system' | 'anon'
  action text NOT NULL,               -- e.g. 'placement.accept', 'admin.application.reject'
  target_type text,                   -- 'placement', 'order', 'user', etc.
  target_id text,
  before jsonb,                       -- prior state (scrubbed of PII)
  after jsonb,                        -- new state (scrubbed of PII)
  reason text,                        -- optional operator comment
  ip_address inet,
  user_agent text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

Retention: 90 days for non-financial events, 7 years for
payment/refund/dispute events (UK tax requirement).

Admin UI: `/admin/audit` reads-only view.

---

## Part 2 — testing architecture

### Test stack audit
- **No tests exist.** No test runner in `package.json`. No `*.test.ts`
  files anywhere. No `playwright.config.ts`. No `vitest.config.ts`.
- No CI — no `.github/workflows`.

### Recommended stack

| Layer | Tool | Why |
|---|---|---|
| Unit | **Vitest** | Fast, ESM-native, TypeScript-first, matches Next.js. Replace with Jest only if you need specific plugins. |
| Component | **Vitest + Testing Library** | Same runner as unit |
| Integration (API + DB) | **Vitest with a real Supabase test project** | RLS can only be tested against real Postgres with auth.users |
| E2E | **Playwright** | Cross-browser, parallelised, standard for Next.js |
| Email rendering | **Vitest + @react-email/render** | Snapshot HTML + assert required links present |
| Payments | **Stripe CLI `trigger` events + webhook-test route** | Trigger real webhook events locally |
| Accessibility | **axe-core via Playwright** | Automated a11y on key pages |
| Visual regression | **Playwright screenshots + diff** | Cheapest; tune thresholds |

### CI gates

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  lint:  "npx eslint"
  types: "npx tsc --noEmit"
  unit:  "npx vitest run"
  build: "npm run build"
  e2e:   "npx playwright test"  # on main only
```

PR gate: lint + types + unit + build
Pre-deploy: + e2e smoke
Nightly: full e2e + dependency scan (`npm audit`, `pnpm audit`)

---

## Part 3 — deliverables

### 3.1 Security audit table (top 20 findings)

| # | Area | Finding | Risk | Fix | Priority |
|---|---|---|---|---|---|
| 1 | Storage | Contracts bucket is public — signed consignment records readable by URL | 🔴 high | Move to private bucket + signed URL per render | P0 |
| 2 | Cron | `/api/stripe-connect/process-pending` fails OPEN if `CRON_SECRET` unset | 🔴 high | Require the env; fail closed | P0 |
| 3 | RLS | Core tables (`artist_profiles`, `venue_profiles`, `orders`, `placements`, `artist_applications`, `artist_works`) likely lack RLS | 🔴 high | Audit in Supabase dashboard; enable RLS + per-user policies | P0 |
| 4 | Messages | `senderSlug` from request body, not derived from `user.id` — impersonation possible | 🔴 high | Look up sender slug server-side from `user.id` | P0 |
| 5 | Rate limiting | In-memory store — useless on serverless | 🔴 high | Upstash Redis-based limiter | P0 |
| 6 | Headers | No CSP, HSTS, X-Frame, X-Content-Type | 🟡 medium | Add `next.config.ts headers()` | P1 |
| 7 | Audit | Zero audit logging | 🟡 medium | Add `audit_log` table + `createAuditLog()` helper | P1 |
| 8 | Tier caps | Client-only — server doesn't enforce artwork count cap | 🟡 medium | Server-side cap check on work creation | P1 |
| 9 | Validation | Admin routes + refund route missing zod schema on body | 🟡 medium | Add schemas, reject on failure | P1 |
| 10 | Tests | Zero tests anywhere | 🟡 medium | Vitest + Playwright + CI | P1 |
| 11 | Env | No `.env.example` | 🟢 low | Create | P1 |
| 12 | Env | No runtime validation | 🟢 low | `env.ts` with zod | P1 |
| 13 | Webhook DLQ | Stripe failures only console.error | 🟡 medium | Store failed events + alert | P1 |
| 14 | Stage transitions | No transition matrix — any party can advance any stage | 🟡 medium | `enforceStatusTransition()` helper with matrix | P2 |
| 15 | Upload | Server doesn't re-validate MIME | 🟢 low | Re-validate via `file-type` | P2 |
| 16 | Storage | Orphaned uploads never cleaned | 🟢 low | Nightly sweep job | P3 |
| 17 | Cookies | Not audited (Supabase defaults) | 🟢 low | Confirm HttpOnly/Secure/SameSite | P2 |
| 18 | Account deletion | Not implemented | 🟡 medium | GDPR obligation for live product | P1 before launch |
| 19 | Data export | Not implemented | 🟡 medium | GDPR obligation | P1 before launch |
| 20 | 2FA | Not implemented | 🟢 low | Supabase supports TOTP — enable for admins at least | P2 |

### 3.2 Permission matrix

Legend: **O** = own rows only, **P** = placement party (artist OR venue on the row), **Pub** = public read, **X** = denied.

| Resource | Artist | Venue | Customer | Admin | Immutable after |
|---|---|---|---|---|---|
| `artist_profiles` (own) | read/update O | Pub read | Pub read | all | — |
| `artist_profiles` (other) | Pub read | Pub read | Pub read | all | — |
| `venue_profiles` (own) | Pub read | read/update O | Pub read | all | — |
| `venue_profiles` (other) | Pub read | Pub read | Pub read | all | — |
| `artist_works` | CRUD O | Pub read | Pub read | all | hard-delete only when no `orders` ref |
| `placements` | read/update P, insert own | read/update P, insert own | X | all | status=`completed`/`cancelled` ⇒ immutable |
| `placement_records` | read/update P | read/update P | X | all | both-parties approved ⇒ content frozen (current: resets on change) |
| `placement_photos` | read/insert P | read/insert P | X | all | — |
| `messages` | read/insert P | read/insert P | X (except support thread) | all | message_id immutable, `is_read` user-flippable |
| `conversations` | read P | read P | X | all | — |
| `orders` | read O (as artist) | read O (as venue on placement) | read O (as buyer) | all | status=`refunded` ⇒ content immutable |
| `refund_requests` | read own, insert own | insert if venue order | read own, insert own | all | status=`approved`/`rejected` ⇒ immutable |
| `stripe_transfers` | X | X | X | all (via service role) | always immutable |
| `reviews` | read all, insert if placement party | same | read all, insert if order buyer | all | `placement_id` immutable, content editable 24h |
| `notifications` | read own | read own | read own | all | `read_at` user-flippable |
| `email_preferences` | read/update own | read/update own | read/update own | all | — |
| `email_events` | X | X | X | all | immutable |
| `email_suppressions` | insert own (via footer) | insert own | insert own | all | immutable |
| `saved_items` | CRUD own | CRUD own | CRUD own | all | — |
| `artist_applications` | insert own | X | X | all | status=`accepted`/`rejected` ⇒ immutable |
| `curation_requests` | X | insert, read own | X | all | status=`paid` ⇒ immutable |
| `audit_log` | X | X | X | read all | always immutable |
| `admin_users` | X | X | X | read all (admin-only) | service role only |
| `terms_acceptances` | read/insert own | read/insert own | read/insert own | all | insert-only |

### 3.3 Sensitive operation checklist

For each, every row needs: auth ✓, validation ✓, permission ✓, audit ✓, rate-limit ✓, test ✓.

| Operation | Auth | Validate | Permission | Audit | Rate-limit | Tests |
|---|---|---|---|---|---|---|
| Signup | anon | zod | — | ✓ | IP 3/10min | Playwright |
| Login | anon | — | — | ✓ on fail | IP+email 5/15min | Playwright |
| Password reset | anon | email | — | ✓ | IP+email 3/60min | Playwright |
| Update profile | required | zod | own | ✓ (before/after) | user 30/10min | Integration |
| Upload artwork | required | zod + MIME re-check | own | ✓ | user 20/60min | Integration |
| Create placement | required | zod | — | ✓ | user 10/60min | Integration + E2E |
| Accept placement | required | — | not-requester + party | ✓ | user 30/10min | Integration |
| Counter placement | required | zod counter schema | counter role rule | ✓ | user 10/60min | Integration + unit |
| Decline placement | required | — | not-requester + party | ✓ | user 30/10min | Integration |
| Advance stage | required | — | party + transition matrix | ✓ (stage+from+to) | user 30/10min | Integration + unit |
| Update consignment record | required | zod record | party | ✓ (diffs) | user 30/10min | Integration |
| Send message | required | zod + moderation | recipient party | ✓ (flagged only) | user 30/5min | Integration + E2E |
| Create order (checkout) | optional | zod | — | ✓ | IP 10/10min | Integration |
| Refund request | required | zod | buyer | ✓ | user 3/60min | Integration |
| Refund process | required | zod | admin or artist | ✓ (full trail) | user 20/10min | Integration + E2E |
| Payout trigger | system | — | CRON_SECRET | ✓ | — | Integration |
| Subscription change | system (Stripe) | — | signature | ✓ | — | Webhook test |
| Admin approve app | required | zod | admin | ✓ | admin 100/10min | Integration |
| Admin reject app | required | zod | admin | ✓ | admin 100/10min | Integration |
| Admin restrict account | required | zod | admin | ✓ | admin 100/10min | Integration |
| Email unsubscribe | anon token | zod | token-matches-user | ✓ | — | Integration |
| Data export request | required | — | own | ✓ | user 1/24h | Integration |
| Account deletion | required | confirm password | own | ✓ | — | Integration + E2E |

### 3.4 First 25 tests to write (ranked by risk × value)

| # | Test | Why | Type | Files |
|---|---|---|---|---|
| 1 | Non-party cannot read a placement | Core privacy contract | RLS/integration | `placements` table, `api/placements/[id]` |
| 2 | Non-party cannot read a `placement_record` | Contracts are private | RLS | `placement_records` |
| 3 | Non-party cannot read messages between A and B | Core privacy | RLS | `messages` |
| 4 | Requester cannot accept their own placement | Prevents self-deals | Unit + integration | `placement-permissions.ts`, `api/placements PATCH` |
| 5 | Counter offerer cannot accept their own counter | Same, but for the flipped role | Unit | `placement-permissions.ts` |
| 6 | `POST /api/messages` ignores forged `senderSlug` | Impersonation prevention | Integration | `api/messages/route.ts` |
| 7 | `POST /api/placements` ignores forged `requesterUserId` | Same | Integration | `api/placements/route.ts` |
| 8 | Stripe webhook replay = no duplicate order | Idempotency | Integration + webhook | `api/webhooks/stripe/route.ts` |
| 9 | Stripe webhook with bad signature rejected | Signature verification | Integration | same |
| 10 | Refund with failed transfer reversal aborts refund | Protects platform balance | Integration | `api/refunds/process/route.ts` |
| 11 | `customer_order_receipt` renders with no missing links | Legal requirement | Unit | render test |
| 12 | Email `idempotencyKey` dedupes on replay | Pipeline correctness | Integration | `src/lib/email/send.ts` |
| 13 | Rate limiter blocks 6th login in 15 min | Core protection | Integration | `rate-limit.ts` |
| 14 | Admin-only route returns 403 for non-admin | Access control | Integration | `api/admin/*` |
| 15 | Tier cap blocks 4th work on Core plan via API | Server-side enforcement | Integration | `api/artist-works/*` |
| 16 | `/email-preview` blocked in production | Info disclosure | Integration | `app/email-preview/*` |
| 17 | Contract upload goes to private bucket, signed URL | Private doc handling | Integration | `lib/upload.ts` |
| 18 | Placement status `completed` cannot be rolled back by non-admin | Immutability | Integration | `api/placements PATCH` |
| 19 | Counter after decline re-opens to pending (as designed) | Complex flow | Integration | same |
| 20 | `canRespond()` returns false for legacy NULL requester | Current helper | Unit | `placement-permissions.ts` |
| 21 | Moderation: blocked phrase rejects message | Content safety | Unit | `moderation.ts` |
| 22 | Moderation: flagged phrase delivers + flags | Review queue | Unit | same |
| 23 | `sendEmail` respects `email_suppressions` | Compliance | Integration | `email/send.ts` |
| 24 | `sendEmail` skips if user opted out of category | Preferences | Integration | same |
| 25 | E2E: artist signup → upload work → receive placement request (happy path) | Smoke | Playwright | full flow |

### 3.5 Suggested code helpers

Lives in `src/lib/security/` (new):

```
src/lib/security/
├── auth.ts               # requireAuth(), requireRole(), requireAdmin()
├── permissions.ts        # assertCanReadPlacement(), assertCanUpdatePlacement(),
│                           assertCanSendMessage(), assertOwnResource()
├── validation.ts         # validateInput(schema, body) → typed result
├── rate-limit.ts         # withRateLimit() wrapper (Upstash)
├── audit.ts              # createAuditLog(actor, action, target, before, after)
├── transitions.ts        # enforceStatusTransition(from, to, role)
├── headers.ts            # withSecurityHeaders()
├── webhook.ts            # verifyWebhookSignature()
├── context.ts            # getRequestContext() → { ip, userAgent, requestId }
└── route.ts              # safeServerAction() — composes the common chain
```

`safeServerAction()` as a composable:

```ts
export const placementCounter = safeServerAction({
  schema: placementCounterSchema,
  rateLimit: { key: "placement-counter", limit: 10, window: "60m" },
  handler: async ({ user, input, ctx }) => {
    await assertCanCounter(user.id, input.placementId);
    await enforceStatusTransition("pending|declined", "pending", user.id, input.placementId);
    const before = await getPlacement(input.placementId);
    const after = await applyCounter(before, input);
    await createAuditLog({
      actor: user,
      action: "placement.counter",
      target: { type: "placement", id: input.placementId },
      before, after,
      ctx,
    });
    return { ok: true };
  },
});
```

### 3.6 Launch readiness checklist

#### Must-have before any real users
- [ ] RLS audit + policies on core tables (finding #3)
- [ ] Fix `senderSlug` impersonation (#4)
- [ ] Fix `process-pending` fail-open (#2)
- [ ] Private contracts bucket (#1)
- [ ] Real rate limiter (Upstash) (#5)
- [ ] Security headers (#6)
- [ ] `.env.example` + runtime env validation
- [ ] First 10 tests from §3.4 passing in CI

#### Must-have before taking payments
- [ ] All of the above
- [ ] `audit_log` table + wiring on: placement transitions, refunds, payouts, admin actions
- [ ] Stripe webhook DLQ (store failed events + admin alert)
- [ ] Refund happy/unhappy-path integration tests
- [ ] Tier cap enforced server-side
- [ ] PCI: no card data ever touches Wallplace DB (Stripe-hosted checkout — confirm)
- [ ] Terms of Service + Privacy Policy published
- [ ] Cookie banner (if adding any non-essential cookies)
- [ ] Dispute / refund resolution flow test-covered

#### Must-have before public launch
- [ ] Account deletion flow
- [ ] Data export flow
- [ ] Unsubscribe + preference centre working
- [ ] Full E2E smoke suite running on CI
- [ ] Dependency scan clean (`npm audit`)
- [ ] Staging environment separate from production
- [ ] Incident response runbook (who do you call at 3am)
- [ ] Admin 2FA enabled
- [ ] On-call / alerts hooked up (Stripe webhook failures, auth failure spikes, DB errors)

#### Nice-to-have after launch
- [ ] BIMI / verified sender for emails
- [ ] CAPTCHA on high-abuse endpoints
- [ ] Bot protection (Cloudflare Turnstile)
- [ ] Malware scanning on uploads
- [ ] Visual regression tests
- [ ] Accessibility audit to WCAG 2.1 AA
- [ ] Pentest

---

## Recommended first phase

If I were you, **Phase 0 — immediate safety fixes** is a 1–2 day block
that eliminates the sharpest risks before anything else:

1. **Verify + fix RLS on core tables** (item 3) — the single biggest
   unknown. 2 hours to audit, 2–4 hours to write policies + migration.
2. **Fix the message impersonation bug** (item 4) — derive sender slug
   from `user.id` server-side. 30 minutes.
3. **Fix `process-pending` fail-open** (item 2) — one-line change.
4. **Move contracts to a private bucket with signed URLs** (item 1) —
   3–4 hours (new bucket, update `uploadContract`, update download code).
5. **Add `.env.example` + a boot-time `env.ts` with zod** — 1 hour.
6. **Add basic security headers in `next.config.ts`** — 30 min, CSP in
   report-only mode first.

No new features until those are done. After Phase 0 is green, start
Phase 1 — Vitest + Playwright + CI + a real rate limiter — and write
the first 10 tests from §3.4 against the freshly fixed code so we
never regress.

Want me to start on Phase 0?
