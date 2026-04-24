# Tests

Wallplace tests in three tiers:

| Tier | Runner | Where | Speed | Runs on |
|---|---|---|---|---|
| Unit | Vitest | `src/**/*.test.ts` (co-located with the module) | < 2s for all | Every PR |
| Integration | Vitest | `tests/integration/*.test.ts` | ~4s | Every PR |
| E2E | Playwright | `tests/e2e/*.spec.ts` | ~10s | Every PR + main |

## Scripts

```bash
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (unit + integration)
npm run test:watch   # vitest in watch mode
npm run test:ui      # vitest UI on http://localhost:51204
npm run test:e2e     # playwright against the dev server
npm run test:e2e:ui  # playwright UI
npm run check        # lint + typecheck + test (run before pushing)
```

## What's covered today

Unit (79 tests):

- `src/lib/placement-permissions.test.ts` (19) — `canRespond()` matrix including
  the "requester can't accept their own placement" + "counter-er can't accept
  their own counter" rules, plus legacy NULL-requester handling.
- `src/lib/moderation.test.ts` (22) — blocked patterns, flagged patterns,
  length guards, regression tests for word-boundary false positives.
- `src/lib/validations.test.ts` (32) — zod schema bounds for the public
  forms + authed endpoints (waitlist, contact, messages, placements,
  checkout, apply).
- `src/lib/platform-fee.test.ts` (11) — Core/Premium/Pro rates, free_until
  window, case-insensitivity, unknown-plan fallback.
- `src/env.test.ts` (4) — serverEnv throws on missing required vars;
  publicEnv only exposes NEXT_PUBLIC_ keys.
- `src/lib/rate-limit.test.ts` (11) — getIP preference order, in-memory
  fallback allow/block/retry-after, per-IP + per-path + per-rule bucketing.

Integration (4):

- `tests/integration/stripe-webhook.test.ts` — signature verification on
  `/api/webhooks/stripe`: 400 on missing header, 400 on wrong signature,
  500 when `STRIPE_WEBHOOK_SECRET` unset, 200 on valid.

E2E (8):

- `tests/e2e/smoke.spec.ts` — homepage, /browse (portfolios + gallery),
  /email-preview index + individual template, /login, /apply. Plus a
  check that the Phase-0 security headers are actually on the wire.

## What's NOT covered yet (Phase 2+)

- RLS tests against a real Supabase project — audit §3.4 tests 1, 2, 3
  need a test DB with anon role access
- `POST /api/messages` forged-senderSlug integration test — needs full
  mocked Supabase chain
- `POST /api/placements` forged-requesterUserId — same
- Duplicate-webhook idempotency (audit test #8) — needs full stripe event
  + mocked Supabase DB state
- Refund failed-transfer rollback (audit test #10) — same
- Auth'd Playwright flows (seed + login)
- Accessibility audit with `@axe-core/playwright`
- Visual regression

## Patterns

### Unit test — co-located

Prefer co-location (`src/lib/foo.ts` + `src/lib/foo.test.ts`). Easier to
find, easier to keep in sync. Vitest's `include` covers both
`src/**/*.test.ts` and `tests/integration/**/*.test.ts`.

### Integration test — mock the boundary, test the logic

```ts
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => ({ ... }) }));
vi.mock("@/lib/stripe", () => ({ stripe: { webhooks: { constructEvent: ... } } }));
// Then import the route AFTER the mocks so it picks them up.
import { POST } from "@/app/api/webhooks/stripe/route";
```

### E2E test — test routes, not implementation

Playwright tests run against a real Next.js dev server. Don't reach into
React internals — use role-based selectors (`getByRole`, `getByLabel`) or
placeholder text. If a selector breaks, it probably means the DOM actually
changed in a way a real user would notice.

## Running against CI

`.github/workflows/ci.yml` (repo root) wires these up on push/PR to main:

1. **check** job: `npm ci && npm run lint && npm run typecheck && npm run test`
   — under 2 minutes.
2. **e2e** job: builds the app, installs Chromium, runs Playwright.
   Playwright report uploaded on failure.

Missing env vars in CI are substituted with obvious placeholders
(`https://placeholder.supabase.co`) so the build + env parse succeeds
without any real infra.

## Adding a test

```bash
# Unit
touch src/lib/new-helper.test.ts
npm run test:watch      # see it go green

# E2E
touch tests/e2e/my-flow.spec.ts
npm run test:e2e:ui     # interactive runner
```

## Known flakes

None yet. If you hit one, open an issue and quarantine with `test.skip`
rather than leave it flaky — a flaky test that fails 1% of CI runs burns
more trust than it saves.
