# Per-work Arrangements and Per-size Loan Fees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each work gets revenue share and paid loan tick boxes that follow the artist's profile until changed, the paid loan fee moves onto each size, and every surface that shows or starts from a work's terms reads them the same way.

**Architecture:** Migration 149 adds two nullable booleans to `artist_works` and a CHECK on per-size fees inside the `pricing` jsonb. `src/lib/work-terms.ts` stays the one place terms are resolved; it gains per-size fees, the two ticks and a size-aware starting point for placement forms. The editor, the Galleries card, the public work page, four placement forms and the profile page all read through it. The single work-level fee from migration 148 is retired in the last code task.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, zod, Vitest with Testing Library, Supabase Postgres (project `uwkuhygwvasdzwsusiym`).

**Spec:** `docs/superpowers/specs/2026-09-13-work-arrangements-and-per-size-loan-fees-design.md`

## Global Constraints

- Work from `website/`. Run node commands with `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem` if TLS fails.
- British English. No em dashes, en dashes or double hyphens in anything a user reads (AGENTS.md public-copy rules).
- Per-size fee: blank, or £15 (`PAID_LOAN_MIN_GBP`) to £100,000, rounded to pence.
- A revenue share the artist types: a whole number from 1 to 100. A rate that follows the profile is never validated.
- Null on either tick or the rate means "follow the profile". A work stores only what differs from the profile.
- `POST /api/artist-works` writes a terms column only when the request names it (the reorder re-save sends none).
- Every new `artist_works` column joins `extendedColumns` (`src/lib/db/artist-works.ts`) and `ARTIST_WORK_WRITABLE` (`src/lib/db/writable-fields.ts`).
- A new per-size key must be declared in `sizePricingSchema`, because `z.object` strips undeclared keys (E46a).
- Terms are resolved only in `src/lib/work-terms.ts` (AGENTS.md: derived values in one exported function).
- No production writes without asking the owner first: applying the migration, pushing, opening or merging the PR.
- One commit per task. Each message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `supabase/migrations/149_work_arrangements_and_size_loan_fees.sql` | two tick columns, per-size fee CHECK | 1 |
| `tests/integration/work-arrangements-migration.test.ts` | holds the SQL to the app's rules | 1 |
| `src/lib/work-terms.ts` | resolve ticks, rates, per-size fees, starting terms, editor parsing | 2, 11 |
| `src/data/artists.ts` | `SizePricing` and `ArtistWork` types, sample data | 2, 10, 11 |
| `src/lib/validations.ts`, `src/app/api/artist-works/route.ts`, `src/lib/db/artist-works.ts`, `src/lib/db/writable-fields.ts`, `src/lib/db/artist-profiles-transform.ts`, `src/components/portfolio/changed-works.ts` | save path | 3, 11 |
| `src/data/galleries.ts`, `src/components/WorkTermsLine.tsx`, `src/app/(pages)/browse/page.tsx` | Galleries card | 4 |
| `src/components/portfolio/WorksEditor.tsx` | ticks, fee column, save | 5 |
| `src/components/SpacesPlacementRequestForm.tsx`, `src/app/(pages)/spaces/page.tsx`, `src/components/visualizer/WallVisualizer.tsx`, `src/components/visualizer/WorksPanel.tsx`, `src/app/(pages)/artist-portal/placements/page.tsx` | artist placement forms | 6 |
| `src/app/(pages)/venue-portal/placements/venue-starting-terms.ts` (new), `src/app/(pages)/venue-portal/placements/page.tsx` | venue placement form | 7 |
| `src/app/(pages)/browse/[slug]/[workSlug]/ArtworkPageClient.tsx`, `page.tsx`, `placement-request-href.ts` (new) | public work page | 8 |
| `src/app/(pages)/artist-portal/profile/page.tsx` | deal types | 9 |
| `src/data/seed-terms.test.ts` | sample data rules | 10 |

---

### Task 1: Migration 149

**Files:**
- Create: `website/supabase/migrations/149_work_arrangements_and_size_loan_fees.sql`
- Create: `website/tests/integration/work-arrangements-migration.test.ts`
- Modify: `website/tests/integration/schema-columns.json` (the `artist_works` array, line 13)

**Interfaces:**
- Produces: columns `artist_works.open_to_revenue_share boolean`, `artist_works.open_to_free_loan boolean`; function `public.artist_work_pricing_loan_fees_valid(jsonb) returns boolean`; constraint `artist_works_pricing_loan_fees_range`.

- [ ] **Step 1: Write the failing test**

```ts
// Migration 149. Per-size loan fees live inside the pricing jsonb, and row
// security lets an artist update their own row directly, so the range is held
// in SQL as well as zod. This keeps the two in step, and pins the two ways the
// CHECK's function could break artists' own saves.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PAID_LOAN_MIN_GBP } from "../../src/lib/pricing";

const SQL = readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/149_work_arrangements_and_size_loan_fees.sql"),
  "utf8",
);

describe("149_work_arrangements_and_size_loan_fees.sql", () => {
  it("adds both per-work ticks as nullable booleans with no default, so every work follows its profile", () => {
    expect(SQL).toMatch(/add column if not exists open_to_revenue_share boolean\s*,/i);
    expect(SQL).toMatch(/add column if not exists open_to_free_loan boolean\s*;/i);
    expect(SQL).not.toMatch(/boolean\s+(not null|default)/i);
  });

  it("uses the app's fee floor and the £100,000 cap for each size", () => {
    const floor = /'paidLoanMonthlyGbp'\)::numeric >= (\d+(?:\.\d+)?)/i.exec(SQL)?.[1];
    expect(Number(floor)).toBe(PAID_LOAN_MIN_GBP);
    expect(SQL).toMatch(/'paidLoanMonthlyGbp'\)::numeric <= 100000/i);
  });

  it("pins search_path and leaves EXECUTE with the writing role", () => {
    expect(SQL).toMatch(/set search_path = ''/i);
    expect(SQL).not.toMatch(/security definer/i);
    expect(SQL).not.toMatch(/revoke\s+execute/i);
  });

  it("attaches the check to pricing", () => {
    expect(SQL).toMatch(/check \(public\.artist_work_pricing_loan_fees_valid\(pricing\)\)/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/integration/work-arrangements-migration.test.ts`
Expected: FAIL, `ENOENT` for the migration file.

- [ ] **Step 3: Write the migration**

```sql
-- 149: per-work arrangement ticks and per-size paid loan fees.
-- Spec: docs/superpowers/specs/2026-09-13-work-arrangements-and-per-size-loan-fees-design.md
--
-- 1. Two nullable booleans on artist_works. Null follows the artist's profile,
--    so every existing work keeps doing exactly what it does today.
-- 2. A CHECK on each pricing entry's paidLoanMonthlyGbp. Row security lets an
--    artist update their own row with the publishable key and skip zod, so the
--    range lives here too, as migration 148 did for its columns.
--
-- Safe against the code already deployed: nothing reads the new columns yet,
-- and no pricing entry carries the key (checked 13 September 2026).

alter table public.artist_works
  add column if not exists open_to_revenue_share boolean,
  add column if not exists open_to_free_loan boolean;

comment on column public.artist_works.open_to_revenue_share is
  'Null follows artist_profiles.open_to_revenue_share. True or false is this work''s own setting.';
comment on column public.artist_works.open_to_free_loan is
  'Paid loan, under the legacy name artist_profiles uses. Null follows artist_profiles.open_to_free_loan.';

-- SECURITY INVOKER (the default), and EXECUTE stays with authenticated:
-- Postgres checks EXECUTE on a CHECK constraint's function for the role doing
-- the write, so revoking it would block every direct update an artist makes.
create or replace function public.artist_work_pricing_loan_fees_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(
    jsonb_typeof(e -> 'paidLoanMonthlyGbp') is null
    or jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'null'
    or (
      jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'number'
      and (e ->> 'paidLoanMonthlyGbp')::numeric >= 15
      and (e ->> 'paidLoanMonthlyGbp')::numeric <= 100000
    )
  ), true)
  from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) as e
$$;

alter table public.artist_works
  drop constraint if exists artist_works_pricing_loan_fees_range,
  add constraint artist_works_pricing_loan_fees_range
    check (public.artist_work_pricing_loan_fees_valid(pricing));

notify pgrst, 'reload schema';
```

- [ ] **Step 4: Run the migration guards**

Run: `npx vitest run tests/integration/work-arrangements-migration.test.ts tests/integration/migration-numbering.test.ts tests/integration/new-table-lockdown.test.ts`
Expected: PASS.

- [ ] **Step 5: Check the function body against the live database, read-only**

Run through the Supabase MCP `execute_sql` (a plain `select`, no DDL):

```sql
with cases(name, p, expected) as (values
  ('no fee key', '[{"label":"A4","price":120}]'::jsonb, true),
  ('null fee', '[{"label":"A4","paidLoanMonthlyGbp":null}]'::jsonb, true),
  ('at the floor', '[{"label":"A4","paidLoanMonthlyGbp":15}]'::jsonb, true),
  ('pence', '[{"label":"A4","paidLoanMonthlyGbp":42.5}]'::jsonb, true),
  ('under the floor', '[{"label":"A4","paidLoanMonthlyGbp":5}]'::jsonb, false),
  ('over the cap', '[{"label":"A4","paidLoanMonthlyGbp":100001}]'::jsonb, false),
  ('a string', '[{"label":"A4","paidLoanMonthlyGbp":"40"}]'::jsonb, false),
  ('one bad size of two', '[{"label":"A4","paidLoanMonthlyGbp":40},{"label":"A3","paidLoanMonthlyGbp":1}]'::jsonb, false),
  ('not an array', '{"label":"A4"}'::jsonb, true),
  ('sql null', null::jsonb, true)
), checked as (
  select name, expected, (
    select coalesce(bool_and(
      jsonb_typeof(e -> 'paidLoanMonthlyGbp') is null
      or jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'null'
      or (jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'number'
          and (e ->> 'paidLoanMonthlyGbp')::numeric >= 15
          and (e ->> 'paidLoanMonthlyGbp')::numeric <= 100000)
    ), true)
    from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) as e
  ) as actual
  from cases
)
select name, expected, actual from checked where expected is distinct from actual;
```

Expected: zero rows. Then confirm no existing row would fail the constraint:

```sql
select count(*) as failing_rows
from public.artist_works w
where not coalesce((
  select bool_and(
    jsonb_typeof(e -> 'paidLoanMonthlyGbp') is null
    or jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'null'
    or (jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'number'
        and (e ->> 'paidLoanMonthlyGbp')::numeric between 15 and 100000))
  from jsonb_array_elements(case when jsonb_typeof(w.pricing) = 'array' then w.pricing else '[]'::jsonb end) as e
), true);
```

Expected: `failing_rows = 0`.

- [ ] **Step 6: Add the columns to the schema snapshot**

In `tests/integration/schema-columns.json`, the `artist_works` array ends `"revenue_share_percent", "paid_loan_monthly_gbp"]`. Change that ending to:

```json
"revenue_share_percent", "paid_loan_monthly_gbp", "open_to_revenue_share", "open_to_free_loan"]
```

The snapshot mirrors production, so Task 12 must apply 149 before the merge.

Run: `npx vitest run tests/integration/phantom-write-columns.test.ts tests/integration/phantom-columns.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/149_work_arrangements_and_size_loan_fees.sql tests/integration/work-arrangements-migration.test.ts tests/integration/schema-columns.json
git commit -m "Migration 149: per-work arrangement ticks and per-size loan fee check"
```

### Task 2: The terms module

**Files:**
- Modify: `website/src/data/artists.ts` (`SizePricing` at lines 5-25, `ArtistWork` terms fields at lines 89-93)
- Modify: `website/src/lib/work-terms.ts`
- Test: `website/src/lib/work-terms.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (every later task relies on these exact names):
  - `LoanFeeSize { label: string; paidLoanMonthlyGbp?: number | null }`
  - `WorkTermsInput { revenueShareOverride?; openToRevenueShareOverride?: boolean | null; openToFreeLoanOverride?: boolean | null; pricing?: ReadonlyArray<LoanFeeSize> | null; paidLoanMonthlyGbp? }` (the last is legacy, removed in Task 11)
  - `PlacementSelection = WorkTermsInput & { sizeLabel?: string | null }`
  - `ArtistTermsInput { revenueSharePercent?; openToRevenueShare?: boolean | null; openToFreeLoan?: boolean | null }`
  - `resolveWorkTerms(work, artist): { openToRevenueShare; revenueSharePercent; usesDefaultShare; openToFreeLoan; paidLoanFromGbp: number | null; paidLoanFeesVary: boolean; paidLoanMonthlyGbp }`
  - `paidLoanFeeForSize(work, sizeLabel?): number | null`
  - `workTermsFromRow(row)`, `loanFeeSizesFromRow(pricing: unknown): LoanFeeSize[]`, `workTermsSourceFromRow(row)` (the row's terms, with `pricing: LoanFeeSize[]` always an array)
  - `initialPlacementTerms(selections: ReadonlyArray<PlacementSelection>, artist): InitialPlacementTerms`
  - `ProfileTerms`, `WorkArrangementsForm`, `WorkArrangementsResult`, `parseWorkArrangements(form, profile)`
  - `REVENUE_SHARE_RATE_ERROR`, `LOAN_FEE_RANGE_ERROR`

- [ ] **Step 1: Add the types**

In `src/data/artists.ts`, add as the last field of `SizePricing`, after `inStorePrice`:

```ts
  /** Migration 149: the monthly fee to take this size on paid loan, in pounds.
      Null or absent lists no fee for this size. Stored alongside `price` in
      the `artist_works.pricing` JSON column. Read it through
      src/lib/work-terms.ts. */
  paidLoanMonthlyGbp?: number | null;
```

Directly after `revenueShareOverride?: number | null;` in `ArtistWork`, add:

```ts
  /** Migration 149. Null follows the artist's profile; true or false is this
   *  work's own setting. Read both through resolveWorkTerms. */
  openToRevenueShareOverride?: boolean | null;
  openToFreeLoanOverride?: boolean | null;
```

- [ ] **Step 2: Write the failing tests**

In `src/lib/work-terms.test.ts`, replace the import block and the `resolveWorkTerms`, `workTermsFromRow` and `initialPlacementTerms` describe blocks (lines 1-111) with the code below. Leave the `parseWorkTermsForm` and "fee wording" blocks as they are, and add the `parseWorkArrangements` block after them.

```ts
import { describe, expect, it } from "vitest";
import { PAID_LOAN_MIN_GBP } from "./pricing";
import {
  LOAN_FEE_RANGE_ERROR,
  MIXED_TERMS_NOTE,
  REVENUE_SHARE_RATE_ERROR,
  formatMonthlyFee,
  initialPlacementTerms,
  loanFeeSizesFromRow,
  paidLoanFeeForSize,
  parseWorkArrangements,
  parseWorkTermsForm,
  resolveWorkTerms,
  speakMonthlyFee,
  workTermsFromRow,
  workTermsSourceFromRow,
} from "./work-terms";

/** Sizes S1, S2, ... carrying the given fees. */
const fees = (...values: Array<number | null>) =>
  values.map((paidLoanMonthlyGbp, i) => ({ label: `S${i + 1}`, paidLoanMonthlyGbp }));

const open = { revenueSharePercent: 25, openToRevenueShare: true, openToFreeLoan: true };

describe("resolveWorkTerms", () => {
  it("uses the work's own share when it has one", () => {
    expect(resolveWorkTerms({ revenueShareOverride: 30 }, open)).toMatchObject({ revenueSharePercent: 30, usesDefaultShare: false });
  });

  it("falls back to the artist's default, and to 0 when there is none", () => {
    expect(resolveWorkTerms({}, open)).toMatchObject({ revenueSharePercent: 25, usesDefaultShare: true });
    expect(resolveWorkTerms({}, {}).revenueSharePercent).toBe(0);
  });

  it("follows the profile's ticks until the work sets its own", () => {
    const closed = { ...open, openToRevenueShare: false, openToFreeLoan: false };
    expect(resolveWorkTerms({}, closed)).toMatchObject({ openToRevenueShare: false, openToFreeLoan: false });
    expect(resolveWorkTerms({ openToRevenueShareOverride: true, openToFreeLoanOverride: true }, closed))
      .toMatchObject({ openToRevenueShare: true, openToFreeLoan: true });
    expect(resolveWorkTerms({ openToRevenueShareOverride: false, openToFreeLoanOverride: false }, open))
      .toMatchObject({ openToRevenueShare: false, openToFreeLoan: false });
  });

  it("reads a profile with no ticks as open, as the profile transform does", () => {
    expect(resolveWorkTerms({}, { revenueSharePercent: 25 })).toMatchObject({ openToRevenueShare: true, openToFreeLoan: true });
  });

  it("shows no share on a work not open to revenue share, even with a rate of its own", () => {
    expect(resolveWorkTerms({ revenueShareOverride: 30, openToRevenueShareOverride: false }, open).revenueSharePercent).toBe(0);
  });

  it("reports the lowest listed fee and whether the sizes differ", () => {
    expect(resolveWorkTerms({ pricing: fees(60, 40, null) }, open)).toMatchObject({ paidLoanFromGbp: 40, paidLoanFeesVary: true });
    expect(resolveWorkTerms({ pricing: fees(40, 40) }, open)).toMatchObject({ paidLoanFromGbp: 40, paidLoanFeesVary: false });
    expect(resolveWorkTerms({ pricing: fees(null) }, open)).toMatchObject({ paidLoanFromGbp: null, paidLoanFeesVary: false });
  });

  it("lists no fee on a work not open to paid loan", () => {
    expect(resolveWorkTerms({ pricing: fees(40), openToFreeLoanOverride: false }, open).paidLoanFromGbp).toBeNull();
  });
});

describe("paidLoanFeeForSize", () => {
  const work = {
    pricing: [
      { label: "A4", paidLoanMonthlyGbp: 30 },
      { label: "A3", paidLoanMonthlyGbp: null },
      { label: "A2", paidLoanMonthlyGbp: 55 },
    ],
  };

  it("returns the fee for the chosen size", () => {
    expect(paidLoanFeeForSize(work, "A2")).toBe(55);
  });

  it("returns null for a chosen size that lists no fee", () => {
    expect(paidLoanFeeForSize(work, "A3")).toBeNull();
  });

  it("returns the lowest listed fee with no size, or a label that names none of the sizes", () => {
    expect(paidLoanFeeForSize(work)).toBe(30);
    expect(paidLoanFeeForSize(work, "")).toBe(30);
    expect(paidLoanFeeForSize(work, "70 x 100 cm")).toBe(30);
  });
});

describe("reading raw artist_works rows", () => {
  it("reads the rate and both ticks, tolerating a numeric string and ignoring non-booleans", () => {
    expect(workTermsFromRow({ revenue_share_percent: "30", open_to_revenue_share: false, open_to_free_loan: "yes" }))
      .toMatchObject({ revenueShareOverride: 30, openToRevenueShareOverride: false, openToFreeLoanOverride: null });
  });

  it("reads missing columns as following the profile", () => {
    expect(workTermsFromRow({}))
      .toMatchObject({ revenueShareOverride: null, openToRevenueShareOverride: null, openToFreeLoanOverride: null });
  });

  it("reads per-size fees off pricing, by label or the legacy size key", () => {
    expect(loanFeeSizesFromRow([{ label: "A4", price: 120, paidLoanMonthlyGbp: "42.50" }, { size: "A3" }, null, "x"]))
      .toEqual([{ label: "A4", paidLoanMonthlyGbp: 42.5 }, { label: "A3", paidLoanMonthlyGbp: null }]);
    expect(loanFeeSizesFromRow(undefined)).toEqual([]);
  });

  it("builds a whole terms source from one row", () => {
    const source = workTermsSourceFromRow({ open_to_free_loan: true, pricing: [{ label: "A4", paidLoanMonthlyGbp: 40 }] });
    expect(source.openToFreeLoanOverride).toBe(true);
    expect(source.pricing).toEqual([{ label: "A4", paidLoanMonthlyGbp: 40 }]);
  });
});

describe("initialPlacementTerms", () => {
  it("keeps the form's own defaults when nothing is selected", () => {
    expect(initialPlacementTerms([], open)).toEqual({ revenueSharePercent: null, monthlyFeeGbp: null, mixed: false });
  });

  it("starts from one work's share and the fee for its chosen size", () => {
    expect(initialPlacementTerms([{ revenueShareOverride: 30, pricing: fees(40, 60), sizeLabel: "S2" }], open))
      .toEqual({ revenueSharePercent: 30, monthlyFeeGbp: 60, mixed: false });
  });

  it("starts from the lowest listed fee when no size is chosen", () => {
    expect(initialPlacementTerms([{ pricing: fees(60, 40) }], open).monthlyFeeGbp).toBe(40);
  });

  it("keeps the form's own starting share when there is no share anywhere", () => {
    expect(initialPlacementTerms([{}], {}).revenueSharePercent).toBeNull();
  });

  it("starts the share at the first work open to revenue share, and flags the difference", () => {
    const terms = initialPlacementTerms([{ openToRevenueShareOverride: false }, { revenueShareOverride: 30 }], open);
    expect(terms).toMatchObject({ revenueSharePercent: 30, mixed: true });
  });

  it("leaves a work not open to paid loan out of the fee total", () => {
    const terms = initialPlacementTerms([{ pricing: fees(40) }, { pricing: fees(60), openToFreeLoanOverride: false }], open);
    expect(terms).toMatchObject({ monthlyFeeGbp: 40, mixed: true });
  });

  it("totals the fees of works that agree, without flagging them", () => {
    expect(initialPlacementTerms([{ pricing: fees(40) }, { pricing: fees(60) }], open))
      .toEqual({ revenueSharePercent: 25, monthlyFeeGbp: 100, mixed: false });
  });

  it("flags works whose shares differ, or where only some list a fee", () => {
    expect(initialPlacementTerms([{ revenueShareOverride: 30 }, {}], open).mixed).toBe(true);
    expect(initialPlacementTerms([{ pricing: fees(40) }, {}], open).mixed).toBe(true);
  });

  it("rounds the total to pence", () => {
    expect(initialPlacementTerms([{ pricing: fees(15.1) }, { pricing: fees(15.2) }], open).monthlyFeeGbp).toBe(30.3);
  });

  it("words the note without dashes", () => {
    expect(MIXED_TERMS_NOTE).not.toMatch(/[–—]/);
  });
});
```

Append after the "fee wording" block:

```ts
describe("parseWorkArrangements", () => {
  const profile = { revenueSharePercent: 20, openToRevenueShare: true, openToFreeLoan: true };
  const untouched = { revenueShareOffered: null, revenueShareRate: null, paidLoanOffered: null, loanFees: [] as string[] };

  it("saves nothing of its own for a work nobody changed", () => {
    expect(parseWorkArrangements(untouched, profile)).toEqual({
      ok: true,
      openToRevenueShareOverride: null,
      openToFreeLoanOverride: null,
      revenueShareOverride: null,
      loanFees: [],
    });
  });

  it("saves a tick only when it differs from the profile", () => {
    expect(parseWorkArrangements({ ...untouched, revenueShareOffered: false, paidLoanOffered: true }, profile))
      .toMatchObject({ ok: true, openToRevenueShareOverride: false, openToFreeLoanOverride: null });
  });

  it("saves a rate only when it differs from the profile rate", () => {
    expect(parseWorkArrangements({ ...untouched, revenueShareRate: "20" }, profile)).toMatchObject({ revenueShareOverride: null });
    expect(parseWorkArrangements({ ...untouched, revenueShareRate: "30" }, profile)).toMatchObject({ revenueShareOverride: 30 });
  });

  it("refuses a typed rate outside 1 to 100 while revenue share is ticked", () => {
    for (const raw of ["", "0", "101", "12.5", "abc"]) {
      expect(parseWorkArrangements({ ...untouched, revenueShareRate: raw }, profile))
        .toEqual({ ok: false, error: REVENUE_SHARE_RATE_ERROR });
    }
  });

  it("does not check the rate while revenue share is unticked", () => {
    expect(parseWorkArrangements({ ...untouched, revenueShareOffered: false, revenueShareRate: "abc" }, profile))
      .toMatchObject({ ok: true, revenueShareOverride: null });
  });

  it("never blocks a save on a rate that follows the profile", () => {
    expect(parseWorkArrangements(untouched, { ...profile, revenueSharePercent: null }).ok).toBe(true);
  });

  it("reads each size's fee, rounding to pence and keeping blanks as none", () => {
    expect(parseWorkArrangements({ ...untouched, loanFees: ["42.499", " ", String(PAID_LOAN_MIN_GBP)] }, profile))
      .toMatchObject({ ok: true, loanFees: [42.5, null, PAID_LOAN_MIN_GBP] });
  });

  it("refuses a fee outside the range while paid loan is ticked, and drops it while unticked", () => {
    expect(parseWorkArrangements({ ...untouched, loanFees: ["5"] }, profile)).toEqual({ ok: false, error: LOAN_FEE_RANGE_ERROR });
    expect(parseWorkArrangements({ ...untouched, loanFees: ["100001"] }, profile)).toEqual({ ok: false, error: LOAN_FEE_RANGE_ERROR });
    expect(parseWorkArrangements({ ...untouched, paidLoanOffered: false, loanFees: ["5", "40"] }, profile))
      .toMatchObject({ ok: true, openToFreeLoanOverride: false, loanFees: [null, 40] });
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/lib/work-terms.test.ts`
Expected: FAIL, the new exports are not defined.

- [ ] **Step 4: Implement**

In `src/lib/work-terms.ts`, replace everything above `export type WorkTermsFormResult` (lines 1-107) with:

```ts
/**
 * A work's own terms: whether it is offered on revenue share and on paid loan,
 * the share it offers a venue, and the monthly fee to take each size on loan.
 *
 * Specs: docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md, and
 * 2026-09-13-work-arrangements-and-per-size-loan-fees-design.md, which moved the
 * fee onto each size and added the two ticks.
 *
 * A work follows its artist's profile until the artist changes something on it:
 * a null tick or rate means "use the profile". A size with no listed fee shows
 * no price, and the work is still offered for paid loan.
 *
 * AGENTS.md: a derived value is computed in one exported function. Every
 * surface that shows or starts from a work's terms reads them through here.
 */

import { gbp } from "@/lib/curation-tiers";
import { PAID_LOAN_MIN_GBP } from "@/lib/pricing";

/** One size's listed monthly paid loan fee, as it sits in `pricing`. */
export interface LoanFeeSize {
  label: string;
  paidLoanMonthlyGbp?: number | null;
}

export interface WorkTermsInput {
  /** The work's own share, or null / undefined when it uses the default. */
  revenueShareOverride?: number | null;
  /** Null / undefined follows the profile's revenue share tick. */
  openToRevenueShareOverride?: boolean | null;
  /** Null / undefined follows the profile's paid loan tick. */
  openToFreeLoanOverride?: boolean | null;
  /** The work's sizes, each with its listed fee, if any. */
  pricing?: ReadonlyArray<LoanFeeSize> | null;
  /** Migration 148's single fee. Retired by 149; removed in task 11. */
  paidLoanMonthlyGbp?: number | null;
}

/** A selected work and the size chosen for it, if any. */
export type PlacementSelection = WorkTermsInput & { sizeLabel?: string | null };

export interface ArtistTermsInput {
  revenueSharePercent?: number | null;
  /** Missing reads as open, as the profile transform does. */
  openToRevenueShare?: boolean | null;
  openToFreeLoan?: boolean | null;
}

/** What GET /api/artist-works returns beside the works. */
export interface ArtistTermsPayload {
  revenueSharePercent: number | null;
  openToRevenueShare: boolean;
  openToFreeLoan: boolean;
}

export interface ResolvedWorkTerms {
  openToRevenueShare: boolean;
  /** 0 when the work is not open to revenue share. */
  revenueSharePercent: number;
  usesDefaultShare: boolean;
  openToFreeLoan: boolean;
  /** The lowest listed fee, or null when none is listed or paid loan is off. */
  paidLoanFromGbp: number | null;
  /** True when the listed fees differ between sizes. */
  paidLoanFeesVary: boolean;
  /** Migration 148's single fee. Removed in task 11. */
  paidLoanMonthlyGbp: number | null;
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** The fees a work lists, in size order, skipping sizes with none. */
function listedFees(work: WorkTermsInput): number[] {
  return (work.pricing ?? [])
    .map((size) => finiteOrNull(size?.paidLoanMonthlyGbp))
    .filter((fee): fee is number => fee !== null && fee > 0);
}

export function resolveWorkTerms(work: WorkTermsInput, artist: ArtistTermsInput): ResolvedWorkTerms {
  const openToRevenueShare = work.openToRevenueShareOverride ?? artist.openToRevenueShare ?? true;
  const openToFreeLoan = work.openToFreeLoanOverride ?? artist.openToFreeLoan ?? true;
  const override = finiteOrNull(work.revenueShareOverride);
  const fees = openToFreeLoan ? listedFees(work) : [];
  return {
    openToRevenueShare,
    revenueSharePercent: openToRevenueShare ? (override ?? finiteOrNull(artist.revenueSharePercent) ?? 0) : 0,
    usesDefaultShare: override === null,
    openToFreeLoan,
    paidLoanFromGbp: fees.length > 0 ? Math.min(...fees) : null,
    paidLoanFeesVary: new Set(fees).size > 1,
    paidLoanMonthlyGbp: finiteOrNull(work.paidLoanMonthlyGbp),
  };
}

/**
 * The fee for one size. With no size chosen, or a label that names none of the
 * work's sizes, the lowest listed fee. A size that lists no fee returns null.
 */
export function paidLoanFeeForSize(work: WorkTermsInput, sizeLabel?: string | null): number | null {
  if (sizeLabel) {
    const size = (work.pricing ?? []).find((s) => s?.label === sizeLabel);
    if (size) {
      const fee = finiteOrNull(size.paidLoanMonthlyGbp);
      return fee !== null && fee > 0 ? fee : null;
    }
  }
  const fees = listedFees(work);
  return fees.length > 0 ? Math.min(...fees) : null;
}

/**
 * The work's own terms off a raw artist_works row, as GET /api/artist-works
 * returns it. A numeric string is tolerated so a type change upstream cannot
 * silently read a rate as absent. Leaves `pricing` to the caller, because the
 * profile transform spreads this over a work whose pricing it already keeps.
 */
export function workTermsFromRow(row: Record<string, unknown>): {
  revenueShareOverride: number | null;
  openToRevenueShareOverride: boolean | null;
  openToFreeLoanOverride: boolean | null;
  paidLoanMonthlyGbp: number | null;
} {
  return {
    revenueShareOverride: finiteOrNull(row.revenue_share_percent),
    openToRevenueShareOverride: booleanOrNull(row.open_to_revenue_share),
    openToFreeLoanOverride: booleanOrNull(row.open_to_free_loan),
    paidLoanMonthlyGbp: finiteOrNull(row.paid_loan_monthly_gbp),
  };
}

/** Each size's listed fee off a raw `pricing` value. Some rows name a size under `size`. */
export function loanFeeSizesFromRow(pricing: unknown): LoanFeeSize[] {
  if (!Array.isArray(pricing)) return [];
  return pricing
    .filter((size): size is Record<string, unknown> => !!size && typeof size === "object")
    .map((size) => ({
      label: typeof size.label === "string" ? size.label : typeof size.size === "string" ? size.size : "",
      paidLoanMonthlyGbp: finiteOrNull(size.paidLoanMonthlyGbp),
    }));
}

/**
 * A raw row as a whole terms source, for the forms that hold raw rows. `pricing`
 * is always an array here, so the result also fits types that require one,
 * such as the visualiser's PanelWork.
 */
export function workTermsSourceFromRow(
  row: Record<string, unknown>,
): ReturnType<typeof workTermsFromRow> & { pricing: LoanFeeSize[] } {
  return { ...workTermsFromRow(row), pricing: loanFeeSizesFromRow(row.pricing) };
}

export interface InitialPlacementTerms {
  /** Where the revenue share input starts, or null to keep the form's own default. */
  revenueSharePercent: number | null;
  /** Where the monthly fee input starts, or null to keep the form's own default. */
  monthlyFeeGbp: number | null;
  /** True when the selected works disagree, so the form should say so. */
  mixed: boolean;
}

export const MIXED_TERMS_NOTE =
  "These works list different terms. One revenue share and one monthly fee apply to the whole placement, so check the figures below.";

/**
 * Where a placement form's terms start for the selected works, first work first.
 *
 * A placement carries one rate and one fee for all its works, so the share is
 * the first open work's and the fee totals each open work's fee for its size.
 */
export function initialPlacementTerms(
  works: ReadonlyArray<PlacementSelection>,
  artist: ArtistTermsInput,
): InitialPlacementTerms {
  if (works.length === 0) return { revenueSharePercent: null, monthlyFeeGbp: null, mixed: false };

  const artistDefault = finiteOrNull(artist.revenueSharePercent);
  const resolved = works.map((w) => resolveWorkTerms(w, artist));
  const shareOf = (w: WorkTermsInput) => finiteOrNull(w.revenueShareOverride) ?? artistDefault;
  // A work not open to revenue share offers none, which differs from any rate.
  const shareKeys = works.map((w, i) => (resolved[i].openToRevenueShare ? `share:${shareOf(w)}` : "none"));

  const listed = works
    .map((w, i) => (resolved[i].openToFreeLoan ? paidLoanFeeForSize(w, w.sizeLabel) : null))
    .filter((fee): fee is number => fee !== null);
  const total = listed.length > 0 ? Math.round(listed.reduce((sum, fee) => sum + fee, 0) * 100) / 100 : null;

  const firstOpen = resolved.findIndex((r) => r.openToRevenueShare);
  return {
    revenueSharePercent: firstOpen >= 0 ? shareOf(works[firstOpen]) : null,
    monthlyFeeGbp: total,
    mixed: works.length > 1 && (new Set(shareKeys).size > 1 || (listed.length > 0 && listed.length < works.length)),
  };
}
```

Append to the end of the file:

```ts
export const REVENUE_SHARE_RATE_ERROR = "Enter a revenue share from 1 to 100";
export const LOAN_FEE_RANGE_ERROR = `Monthly loan fees run from £${PAID_LOAN_MIN_GBP} to £100,000`;

/** The profile values a work follows until it sets its own. */
export interface ProfileTerms {
  revenueSharePercent: number | null;
  openToRevenueShare: boolean;
  openToFreeLoan: boolean;
}

/** The work editor's arrangement inputs. Null means untouched, so the profile applies. */
export interface WorkArrangementsForm {
  revenueShareOffered: boolean | null;
  /** The rate box as typed, or null while it shows the profile rate. */
  revenueShareRate: string | null;
  paidLoanOffered: boolean | null;
  /** One entry per size row, as typed. */
  loanFees: string[];
}

export type WorkArrangementsResult =
  | {
      ok: true;
      openToRevenueShareOverride: boolean | null;
      openToFreeLoanOverride: boolean | null;
      revenueShareOverride: number | null;
      /** One entry per size row: the fee in pounds, or null for none. */
      loanFees: Array<number | null>;
    }
  | { ok: false; error: string };

/**
 * Check the editor's inputs and turn them into what the work stores: only what
 * differs from the profile, so untouched settings keep following it. A value
 * behind an unticked box is not checked, and an invalid fee there is dropped.
 */
export function parseWorkArrangements(form: WorkArrangementsForm, profile: ProfileTerms): WorkArrangementsResult {
  const shareOffered = form.revenueShareOffered ?? profile.openToRevenueShare;
  const loanOffered = form.paidLoanOffered ?? profile.openToFreeLoan;

  let revenueShareOverride: number | null = null;
  if (form.revenueShareRate !== null) {
    const raw = form.revenueShareRate.trim();
    const rate = raw === "" ? Number.NaN : Number(raw);
    const valid = Number.isInteger(rate) && rate >= 1 && rate <= 100;
    if (shareOffered && !valid) return { ok: false, error: REVENUE_SHARE_RATE_ERROR };
    if (valid && rate !== profile.revenueSharePercent) revenueShareOverride = rate;
  }

  const loanFees: Array<number | null> = [];
  for (const typed of form.loanFees) {
    const raw = typed.trim();
    const fee = raw === "" ? null : Number(raw);
    if (fee === null) {
      loanFees.push(null);
    } else if (Number.isFinite(fee) && fee >= PAID_LOAN_MIN_GBP && fee <= 100_000) {
      loanFees.push(Math.round(fee * 100) / 100);
    } else if (loanOffered) {
      return { ok: false, error: LOAN_FEE_RANGE_ERROR };
    } else {
      loanFees.push(null);
    }
  }

  const ownTick = (value: boolean | null, profileValue: boolean) =>
    value === null || value === profileValue ? null : value;

  return {
    ok: true,
    openToRevenueShareOverride: ownTick(form.revenueShareOffered, profile.openToRevenueShare),
    openToFreeLoanOverride: ownTick(form.paidLoanOffered, profile.openToFreeLoan),
    revenueShareOverride,
    loanFees,
  };
}
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run src/lib/work-terms.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit && npx vitest run src/data src/lib/db src/components/SpacesPlacementRequestForm.test.tsx src/components/visualizer`
Expected: PASS. The changes are additive, so every existing caller still compiles and behaves as before.

- [ ] **Step 6: Commit**

```bash
git add src/data/artists.ts src/lib/work-terms.ts src/lib/work-terms.test.ts
git commit -m "Terms module: per-work ticks, per-size loan fees and size-aware starting terms"
```

### Task 3: The save path

**Files:**
- Modify: `website/src/lib/validations.ts` (`sizePricingSchema` and the terms keys of `artistWorkInputSchema`)
- Modify: `website/src/app/api/artist-works/route.ts` (destructure at lines 68-72, row at lines 191-196)
- Modify: `website/src/lib/db/artist-works.ts` (`extendedColumns`, lines 93-97)
- Modify: `website/src/lib/db/writable-fields.ts` (`ARTIST_WORK_WRITABLE`, lines 239-241)
- Modify: `website/src/lib/db/artist-profiles-transform.ts` (`DbArtistWork`)
- Modify: `website/src/components/portfolio/changed-works.ts` (`postKey`)
- Test: `src/lib/validations.test.ts`, `src/app/api/artist-works/route.test.ts`, `src/components/portfolio/changed-works.test.ts`, `src/lib/db/artist-profiles-transform.test.ts`

**Interfaces:**
- Consumes: Task 2 types (`ArtistWork.openToRevenueShareOverride`, `openToFreeLoanOverride`, `SizePricing.paidLoanMonthlyGbp`) and `workTermsFromRow`.
- Produces: `POST /api/artist-works` accepts `openToRevenueShareOverride` and `openToFreeLoanOverride` (`boolean | null`, optional) and per-size `pricing[i].paidLoanMonthlyGbp`; it ignores the work-level `paidLoanMonthlyGbp`.

- [ ] **Step 1: Write the failing tests**

`src/lib/validations.test.ts`. In the "per-work terms (migration 148)" block, replace the test "holds a listed fee to the paid loan floor and the £100,000 cap" with:

```ts
  it("still accepts the retired work-level fee, so an old tab cannot fail a save", () => {
    for (const value of [40, 5, null]) {
      expect(artistWorkInputSchema.safeParse({ ...work, paidLoanMonthlyGbp: value }).success).toBe(true);
    }
  });
```

and append:

```ts
describe("artistWorkInputSchema: per-work ticks and per-size fees (migration 149)", () => {
  const work = { id: "w_1", title: "Harbour Light", image: "https://example.com/x.jpg" };

  it("accepts either tick as true, false or null, and nothing else", () => {
    for (const value of [true, false, null]) {
      expect(
        artistWorkInputSchema.safeParse({ ...work, openToRevenueShareOverride: value, openToFreeLoanOverride: value }).success,
      ).toBe(true);
    }
    expect(artistWorkInputSchema.safeParse({ ...work, openToFreeLoanOverride: "yes" }).success).toBe(false);
  });

  it("keeps a per-size fee, which z.object would otherwise strip", () => {
    const pricing = [
      { label: "A4", price: 120, paidLoanMonthlyGbp: 42.5 },
      { label: "A3", price: 240, paidLoanMonthlyGbp: null },
    ];
    expect(artistWorkInputSchema.parse({ ...work, pricing }).pricing).toEqual(pricing);
  });

  it("holds a per-size fee to the paid loan floor and the £100,000 cap", () => {
    const withFee = (fee: number) => ({ ...work, pricing: [{ label: "A4", price: 120, paidLoanMonthlyGbp: fee }] });
    expect(artistWorkInputSchema.safeParse(withFee(PAID_LOAN_MIN_GBP)).success).toBe(true);
    expect(artistWorkInputSchema.safeParse(withFee(PAID_LOAN_MIN_GBP - 1)).success).toBe(false);
    expect(artistWorkInputSchema.safeParse(withFee(100_001)).success).toBe(false);
  });
});
```

`src/app/api/artist-works/route.test.ts`. Replace the whole `describe("POST /api/artist-works: per-work terms (migration 148)", ...)` block with:

```ts
describe("POST /api/artist-works: per-work terms (migrations 148 and 149)", () => {
  const row = () => upsertWorkMock.mock.calls[0][1] as Record<string, unknown>;

  it("saves a work's own share and both ticks", async () => {
    const res = await POST(
      req({ ...baseBody, revenueShareOverride: 30, openToRevenueShareOverride: false, openToFreeLoanOverride: true }),
    );
    expect(res.status).toBe(200);
    expect(row()).toMatchObject({ revenue_share_percent: 30, open_to_revenue_share: false, open_to_free_loan: true });
  });

  it("returns a work to its profile with an explicit null", async () => {
    await POST(req({ ...baseBody, revenueShareOverride: null, openToRevenueShareOverride: null, openToFreeLoanOverride: null }));
    expect(row()).toMatchObject({ revenue_share_percent: null, open_to_revenue_share: null, open_to_free_loan: null });
  });

  it("leaves all three untouched when the request does not name them, as a reorder save does", async () => {
    await POST(req(baseBody));
    for (const column of ["revenue_share_percent", "open_to_revenue_share", "open_to_free_loan"]) {
      expect(column in row(), column).toBe(false);
    }
  });

  it("keeps each size's fee on its pricing tier", async () => {
    const pricing = [
      { label: "A4", price: 120, paidLoanMonthlyGbp: 30 },
      { label: "A3", price: 240, paidLoanMonthlyGbp: 45.5 },
    ];
    await POST(req({ ...baseBody, pricing }));
    expect(row().pricing).toEqual(pricing);
  });

  it("refuses a per-size fee under the paid loan floor", async () => {
    const res = await POST(req({ ...baseBody, pricing: [{ label: "A4", price: 120, paidLoanMonthlyGbp: 5 }] }));
    expect(res.status).toBe(400);
    expect(upsertWorkMock).not.toHaveBeenCalled();
  });

  it("accepts the retired work-level fee from an old tab but never writes it", async () => {
    const res = await POST(req({ ...baseBody, paidLoanMonthlyGbp: 40 }));
    expect(res.status).toBe(200);
    expect("paid_loan_monthly_gbp" in row()).toBe(false);
  });
});
```

`src/components/portfolio/changed-works.test.ts`, append:

```ts
describe("worksToPost: per-work ticks and per-size fees (migration 149)", () => {
  it("posts a work whose only change is a tick", () => {
    expect(worksToPost([w("a", { openToFreeLoanOverride: false })], [w("a")]).map((x) => x.work.id)).toEqual(["a"]);
    expect(
      worksToPost([w("b", { openToRevenueShareOverride: true })], [w("b", { openToRevenueShareOverride: null })]).map((x) => x.work.id),
    ).toEqual(["b"]);
  });

  it("posts a work whose only change is one size's fee", () => {
    const before = w("a", { pricing: [{ label: "S", price: 10 }] });
    const after = w("a", { pricing: [{ label: "S", price: 10, paidLoanMonthlyGbp: 40 }] });
    expect(worksToPost([after], [before]).map((x) => x.work.id)).toEqual(["a"]);
  });

  it("treats a missing tick and a null one alike", () => {
    expect(worksToPost([w("a", { openToFreeLoanOverride: null })], [w("a")])).toEqual([]);
  });
});
```

`src/lib/db/artist-profiles-transform.test.ts`, append:

```ts
describe("dbProfileToArtist: per-work ticks and per-size fees (migration 149)", () => {
  it("carries both ticks, and null for a work that follows its profile", () => {
    const [own, follows] = dbProfileToArtist(profile, [
      { ...row, open_to_revenue_share: false, open_to_free_loan: true },
      { ...row, id: "w2" },
    ]).works;
    expect(own).toMatchObject({ openToRevenueShareOverride: false, openToFreeLoanOverride: true });
    expect(follows).toMatchObject({ openToRevenueShareOverride: null, openToFreeLoanOverride: null });
  });

  it("keeps a per-size fee on the pricing tier", () => {
    const pricing = [{ label: "A4", price: 120, paidLoanMonthlyGbp: 30 }];
    expect(dbProfileToArtist(profile, [{ ...row, pricing }]).works[0].pricing).toEqual(pricing);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/lib/validations.test.ts src/app/api/artist-works/route.test.ts src/components/portfolio/changed-works.test.ts`
Expected: FAIL. zod strips the per-size fee and the ticks, the route writes no tick columns, and `postKey` ignores ticks. (The transform tests already pass on Task 2's reader; they pin it.)

- [ ] **Step 3: Implement**

`src/lib/validations.ts`. Add as the last key of `sizePricingSchema`:

```ts
  // Migration 149: the monthly paid loan fee for this size. Same range as the
  // CHECK on pricing; null or absent lists no fee.
  paidLoanMonthlyGbp: z
    .number()
    .finite()
    .min(PAID_LOAN_MIN_GBP, { message: `Monthly loan fees start at £${PAID_LOAN_MIN_GBP}.` })
    .max(100_000)
    .nullable()
    .optional(),
```

In `artistWorkInputSchema`, replace the migration 148 comment and its two keys with:

```ts
  // Migration 148. null clears the work's own rate. An omitted key leaves the
  // stored value alone: the portfolio re-saves every work on a reorder without
  // these keys. Same range as the database CHECK.
  revenueShareOverride: z.number().int().min(0).max(100).nullable().optional(),
  // Migration 149. null returns the work to following the profile; an omitted
  // key leaves it alone, as above.
  openToRevenueShareOverride: z.boolean().nullable().optional(),
  openToFreeLoanOverride: z.boolean().nullable().optional(),
  // Retired by migration 149: fees live on each size in `pricing`. Still
  // accepted so a tab opened before the deploy cannot fail a whole save, and
  // ignored by the route (the inStorePrice precedent).
  paidLoanMonthlyGbp: z.number().finite().nullable().optional(),
```

`src/app/api/artist-works/route.ts`. In the destructure, replace `description, images, revenueShareOverride, paidLoanMonthlyGbp,` with `description, images, revenueShareOverride, openToRevenueShareOverride, openToFreeLoanOverride,`. Replace the migration 148 block in the row (comment plus two spreads) with:

```ts
      // Migrations 148 and 149. Written only when the request names them. The
      // portfolio re-saves every work on a reorder without these keys, and
      // writing null there would silently send an artist's settings back to
      // the profile. An explicit null still does that on purpose. The retired
      // work-level fee (paid_loan_monthly_gbp) is never written: fees live on
      // each size in `pricing` now.
      ...(revenueShareOverride !== undefined ? { revenue_share_percent: revenueShareOverride } : {}),
      ...(openToRevenueShareOverride !== undefined ? { open_to_revenue_share: openToRevenueShareOverride } : {}),
      ...(openToFreeLoanOverride !== undefined ? { open_to_free_loan: openToFreeLoanOverride } : {}),
```

`src/lib/db/artist-works.ts`, in `extendedColumns` replace the migration 148 comment and entries with:

```ts
    // Migrations 148 and 149. Listed here so a write that reaches a database
    // without the columns drops them and saves the rest, instead of failing the
    // core write that would otherwise still carry them.
    "revenue_share_percent",
    "open_to_revenue_share",
    "open_to_free_loan",
```

`src/lib/db/writable-fields.ts`, in `ARTIST_WORK_WRITABLE` replace the migration 148 comment and entries with:

```ts
  // Migration 148: per-work revenue share. Migration 149: per-work arrangement
  // ticks. 148's paid_loan_monthly_gbp is retired; fees live in `pricing`.
  "revenue_share_percent",
  "open_to_revenue_share",
  "open_to_free_loan",
```

`src/lib/db/artist-profiles-transform.ts`, in `DbArtistWork` after the migration 148 fields:

```ts
  /** Migration 149: null follows the profile's tick. */
  open_to_revenue_share?: boolean | null;
  open_to_free_loan?: boolean | null;
```

`src/components/portfolio/changed-works.ts`, in `postKey` after `paidLoanMonthlyGbp: work.paidLoanMonthlyGbp ?? null,`:

```ts
    // Migration 149, for the same reason: a change to a tick alone must post.
    openToRevenueShareOverride: work.openToRevenueShareOverride ?? null,
    openToFreeLoanOverride: work.openToFreeLoanOverride ?? null,
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/lib/validations.test.ts src/app/api/artist-works/route.test.ts src/components/portfolio src/lib/db tests/integration/phantom-write-columns.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts src/lib/validations.test.ts src/app/api/artist-works src/lib/db/artist-works.ts src/lib/db/writable-fields.ts src/lib/db/artist-profiles-transform.ts src/lib/db/artist-profiles-transform.test.ts src/components/portfolio/changed-works.ts src/components/portfolio/changed-works.test.ts
git commit -m "Save path: per-work ticks and per-size loan fees, retire the work-level fee write"
```

### Task 4: The Galleries card

**Files:**
- Modify: `website/src/data/galleries.ts`
- Modify: `website/src/components/WorkTermsLine.tsx`
- Modify: `website/src/app/(pages)/browse/page.tsx` (the `<WorkTermsLine>` props, about line 2690)
- Test: `src/data/galleries.test.ts`, `src/components/WorkTermsLine.test.tsx`

**Interfaces:**
- Consumes: `resolveWorkTerms` from Task 2.
- Produces: `GalleryWork.openToFreeLoan` and `openToRevenueShare` are per work; `GalleryWork.paidLoanFromGbp?: number | null` and `paidLoanFeesVary?: boolean` replace `paidLoanMonthlyGbp`. `WorkTermsLine` props: `openToRevenueShare`, `revenueSharePercent?`, `openToFreeLoan`, `paidLoanFromGbp?`, `paidLoanFeesVary?`, `spacer?` (default true). Task 8 renders it with `spacer={false}`.

- [ ] **Step 1: Write the failing tests**

`src/data/galleries.test.ts`. Replace the test "carries a listed fee to the card, and null when there is none" with:

```ts
  it("carries the lowest per-size fee to the card, and whether the sizes differ", () => {
    const [varies, single, none] = artistsToGalleryWorks([
      artistWith([
        {
          ...work,
          pricing: [
            { label: "A4", price: 100, paidLoanMonthlyGbp: 40 },
            { label: "A3", price: 200, paidLoanMonthlyGbp: 25 },
          ],
        },
        { ...work, id: "w2", pricing: [{ label: "A4", price: 100, paidLoanMonthlyGbp: 40 }] },
        { ...work, id: "w3" },
      ]),
    ]);
    expect(varies).toMatchObject({ paidLoanFromGbp: 25, paidLoanFeesVary: true });
    expect(single).toMatchObject({ paidLoanFromGbp: 40, paidLoanFeesVary: false });
    expect(none).toMatchObject({ paidLoanFromGbp: null, paidLoanFeesVary: false });
  });
```

and append:

```ts
describe("artistsToGalleryWorks: per-work ticks (migration 149)", () => {
  it("uses a work's own ticks for the arrangement flags the card and the filters read", () => {
    const artist = {
      ...artistWith([
        { ...work, openToFreeLoanOverride: true, openToRevenueShareOverride: false },
        { ...work, id: "w2" },
      ]),
      openToFreeLoan: false,
      openToRevenueShare: true,
    } as Artist;
    const [own, follows] = artistsToGalleryWorks([artist]);
    expect(own).toMatchObject({ openToFreeLoan: true, openToRevenueShare: false, revenueSharePercent: 0 });
    expect(follows).toMatchObject({ openToFreeLoan: false, openToRevenueShare: true, revenueSharePercent: 25 });
  });
});
```

`src/components/WorkTermsLine.test.tsx`. Rename every `paidLoanMonthlyGbp=` prop to `paidLoanFromGbp=`, then add inside the describe:

```tsx
  it("says From when the sizes list different fees, in the visible and the spoken text", () => {
    render(<WorkTermsLine {...open} revenueSharePercent={20} paidLoanFromGbp={25} paidLoanFeesVary />);
    expect(screen.getByText("20% Revenue Share · From £25/month Paid Loan")).toBeTruthy();
    expect(screen.getByText("20% Revenue Share, From £25 a month Paid Loan")).toBeTruthy();
  });

  it("renders nothing, not a spacer, when asked for no spacer", () => {
    const { container } = render(
      <WorkTermsLine {...open} revenueSharePercent={0} paidLoanFromGbp={null} spacer={false} />,
    );
    expect(container.innerHTML).toBe("");
  });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/data/galleries.test.ts src/components/WorkTermsLine.test.tsx`
Expected: FAIL. `paidLoanFromGbp` is undefined on gallery works, the flags come from the artist, and the line ignores the new props.

- [ ] **Step 3: Implement**

`src/data/galleries.ts`. In `GalleryWork`, replace the lines from `openToFreeLoan: boolean;` to `paidLoanMonthlyGbp?: number | null;` with:

```ts
  /** The work's own ticks (migration 149), else the artist's profile. The
   *  arrangement line, the Galleries filters and the terms line read these. */
  openToFreeLoan: boolean;
  openToRevenueShare: boolean;
  revenueSharePercent?: number;
  /** Lowest listed monthly paid loan fee across sizes, null for none. */
  paidLoanFromGbp?: number | null;
  /** True when sizes list different fees, so the card says "From". */
  paidLoanFeesVary?: boolean;
```

In `artistsToGalleryWorks`, replace the lines from `openToFreeLoan: artist.openToFreeLoan,` to `paidLoanMonthlyGbp: terms.paidLoanMonthlyGbp,` with:

```ts
      openToFreeLoan: terms.openToFreeLoan,
      openToRevenueShare: terms.openToRevenueShare,
      revenueSharePercent: terms.revenueSharePercent,
      paidLoanFromGbp: terms.paidLoanFromGbp,
      paidLoanFeesVary: terms.paidLoanFeesVary,
```

Replace `src/components/WorkTermsLine.tsx` with:

```tsx
import { formatMonthlyFee, speakMonthlyFee } from "@/lib/work-terms";

/**
 * The orange terms line under a Galleries work card, and under Size & Price on
 * the work page: the revenue share a venue earns and, when the artist lists
 * one, the monthly fee to take the work on paid loan. Specs:
 * docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md and
 * 2026-09-13-work-arrangements-and-per-size-loan-fees-design.md.
 *
 * On a card a transparent spacer stands in when there is nothing to show, so
 * cards in a row keep the same height. Two terms can wrap on a narrow card, so
 * the line reserves two lines below `sm` and one from `sm` up.
 */
export interface WorkTermsLineProps {
  openToRevenueShare: boolean;
  revenueSharePercent?: number | null;
  openToFreeLoan: boolean;
  /** The fee to show: the lowest listed across sizes, or one size's own fee. */
  paidLoanFromGbp?: number | null;
  /** True when sizes list different fees, which the line words as "From". */
  paidLoanFeesVary?: boolean;
  /** Keep a blank row when there is nothing to show. Default true, for cards. */
  spacer?: boolean;
}

const LINE = "text-[11px] mt-1 leading-snug min-h-[2.75em] sm:min-h-[1.375em]";

export default function WorkTermsLine({
  openToRevenueShare,
  revenueSharePercent,
  openToFreeLoan,
  paidLoanFromGbp,
  paidLoanFeesVary = false,
  spacer = true,
}: WorkTermsLineProps) {
  const share =
    openToRevenueShare && revenueSharePercent != null && revenueSharePercent > 0 ? revenueSharePercent : null;
  const fee = openToFreeLoan && paidLoanFromGbp != null && paidLoanFromGbp > 0 ? paidLoanFromGbp : null;

  if (share === null && fee === null) {
    if (!spacer) return null;
    return (
      <p className={LINE} aria-hidden="true">
        &nbsp;
      </p>
    );
  }

  const from = paidLoanFeesVary ? "From " : "";
  const shareText = share !== null ? `${share}% Revenue Share` : null;
  const visible = [shareText, fee !== null ? `${from}${formatMonthlyFee(fee)} Paid Loan` : null]
    .filter(Boolean)
    .join(" · ");
  const spoken = [shareText, fee !== null ? `${from}${speakMonthlyFee(fee)} Paid Loan` : null]
    .filter(Boolean)
    .join(", ");

  return (
    <p className={`${LINE} text-accent font-medium`}>
      {visible === spoken ? (
        visible
      ) : (
        <>
          <span aria-hidden="true">{visible}</span>
          <span className="sr-only">{spoken}</span>
        </>
      )}
    </p>
  );
}
```

`src/app/(pages)/browse/page.tsx`. In the `<WorkTermsLine>` on the gallery card, replace `paidLoanMonthlyGbp={work.paidLoanMonthlyGbp}` with:

```tsx
                              paidLoanFromGbp={work.paidLoanFromGbp}
                              paidLoanFeesVary={work.paidLoanFeesVary}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/data/galleries.test.ts src/components/WorkTermsLine.test.tsx && npx tsc --noEmit`
Expected: PASS. If tsc names another reader of `GalleryWork.paidLoanMonthlyGbp`, switch it to `paidLoanFromGbp` the same way.

- [ ] **Step 5: Commit**

```bash
git add src/data/galleries.ts src/data/galleries.test.ts src/components/WorkTermsLine.tsx src/components/WorkTermsLine.test.tsx "src/app/(pages)/browse/page.tsx"
git commit -m "Galleries card: per-work arrangement flags and From per-size loan fees"
```

### Task 5: The work editor

**Files:**
- Modify: `website/src/components/portfolio/WorksEditor.tsx`
- Test: `website/src/app/(pages)/artist-portal/portfolio/page.test.tsx`

**Interfaces:**
- Consumes: `parseWorkArrangements`, `LOAN_FEE_RANGE_ERROR` (Task 2); the save path from Task 3.
- Produces: the POST body carries `openToRevenueShareOverride`, `openToFreeLoanOverride`, `revenueShareOverride` and per-size `pricing[i].paidLoanMonthlyGbp`, and no longer carries the work-level `paidLoanMonthlyGbp`.

- [ ] **Step 1: Let the test mock return a profile**

In `page.test.tsx`, add `profile: null as unknown,` to the hoisted `artistState` object, add `profile: artistState.profile,` to the object `useCurrentArtist` returns in the mock, and add `artistState.profile = null;` to `beforeEach`.

- [ ] **Step 2: Write the failing tests**

Append to `page.test.tsx`:

```tsx
describe("placement terms on each work (migration 149)", () => {
  const LOAN_OPEN = { revenue_share_percent: 20, open_to_revenue_share: true, open_to_free_loan: true };
  const loanTick = () => screen.getAllByLabelText("Offer on paid loan")[0] as HTMLInputElement;
  const shareTick = () => screen.getAllByLabelText("Offer on revenue share")[0] as HTMLInputElement;
  const rateInput = () => screen.getAllByLabelText("Revenue share for this work, %")[0] as HTMLInputElement;
  const feeInputs = () => screen.queryAllByLabelText(/^Paid loan fee a month for/) as HTMLInputElement[];
  const postedBody = () => JSON.parse((mutateMock.mock.calls.at(-1)![1] as { body: string }).body);

  it("starts both ticks from the profile, with the fee column showing for a loan-open artist", async () => {
    artistState.profile = LOAN_OPEN;
    render(<PortfolioPage />);
    await openAddAndFill();
    expect(loanTick().checked).toBe(true);
    expect(shareTick().checked).toBe(true);
    expect(feeInputs().length).toBeGreaterThan(0);
    expect(rateInput().value).toBe("20");
  });

  it("starts unticked for an artist whose profile says no, who can still tick it and add a fee", async () => {
    artistState.profile = { ...LOAN_OPEN, open_to_free_loan: false };
    mutateMock.mockResolvedValue({ savedRow: { id: "w1" } });
    render(<PortfolioPage />);
    await openAddAndFill();
    expect(loanTick().checked).toBe(false);
    expect(feeInputs()).toHaveLength(0);

    fireEvent.click(loanTick());
    fireEvent.change(feeInputs()[0], { target: { value: "35" } });
    fireEvent.click(screen.getAllByText("Save Work")[0]);

    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith("Artwork added"));
    expect(postedBody()).toMatchObject({ openToFreeLoanOverride: true, openToRevenueShareOverride: null, revenueShareOverride: null });
    expect(postedBody().pricing[0]).toMatchObject({ paidLoanMonthlyGbp: 35 });
    expect("paidLoanMonthlyGbp" in postedBody()).toBe(false);
  });

  it("saves nothing of its own for a work left as the profile set it", async () => {
    artistState.profile = LOAN_OPEN;
    mutateMock.mockResolvedValue({ savedRow: { id: "w1" } });
    render(<PortfolioPage />);
    await openAddAndFill();
    fireEvent.click(screen.getAllByText("Save Work")[0]);

    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith("Artwork added"));
    expect(postedBody()).toMatchObject({ openToFreeLoanOverride: null, openToRevenueShareOverride: null, revenueShareOverride: null });
    expect(postedBody().pricing[0].paidLoanMonthlyGbp).toBeUndefined();
  });

  it("refuses a fee under the floor and keeps the form open", async () => {
    artistState.profile = LOAN_OPEN;
    render(<PortfolioPage />);
    await openAddAndFill();
    fireEvent.change(feeInputs()[0], { target: { value: "5" } });
    fireEvent.click(screen.getAllByText("Save Work")[0]);

    expect((await screen.findAllByText("Monthly loan fees run from £15 to £100,000")).length).toBeGreaterThan(0);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("reopens a work with its own tick and its per-size fee", async () => {
    artistState.profile = LOAN_OPEN;
    artistState.works = [
      { ...WORK, openToRevenueShareOverride: false, pricing: [{ label: "Medium", price: 200, paidLoanMonthlyGbp: 45 }] },
    ];
    render(<PortfolioPage />);
    fireEvent.mouseEnter(await screen.findByTestId(`work-card-${WORK.id}`));
    fireEvent.click((await screen.findAllByRole("button", { name: /^edit$/i }))[0]);
    await screen.findAllByPlaceholderText(TITLE_PLACEHOLDER);

    expect(shareTick().checked).toBe(false);
    expect(feeInputs()[0].value).toBe("45");
  });

  it("keeps the ticks disabled until the profile has loaded", async () => {
    render(<PortfolioPage />);
    await openAddAndFill({ withImage: false });
    expect(loanTick().disabled).toBe(true);
    expect(shareTick().disabled).toBe(true);
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run "src/app/(pages)/artist-portal/portfolio/page.test.tsx"`
Expected: the new tests FAIL (no "Offer on paid loan" control); the existing tests still PASS.

- [ ] **Step 4: Form state, hydration and per-size arrays**

All edits in `src/components/portfolio/WorksEditor.tsx`.

Import: replace `import { parseWorkTermsForm } from "@/lib/work-terms";` with `import { parseWorkArrangements } from "@/lib/work-terms";`.

`WorkFormState`: replace the two migration 148 fields (`revenueShareOverride: string;` and `paidLoanMonthlyGbp: string;` with their comments) with:

```ts
  /** Migration 149. Null while the work follows the profile's revenue share tick. */
  revenueShareOffered: boolean | null;
  /** The rate box as typed, or null while it shows the profile rate. */
  revenueShareRate: string | null;
  /** Migration 149. Null while the work follows the profile's paid loan tick. */
  paidLoanOffered: boolean | null;
  /** Monthly paid loan fee per size, aligned by index with `sizes`. "" lists none. */
  sizeLoanFees: string[];
```

`emptyWork`: replace `revenueShareOverride: "",` and `paidLoanMonthlyGbp: "",` with:

```ts
  revenueShareOffered: null,
  revenueShareRate: null,
  paidLoanOffered: null,
  sizeLoanFees: [],
```

Directly after `const [form, setForm] = useState<WorkFormState>(emptyWork);`:

```ts
  // Spec 2026-09-13 (per-size loan fees). A work follows the profile until the
  // artist changes it, so each control shows `own ?? profile`, and the ticks
  // wait for the profile so a guessed default is never saved as a choice.
  const profileTerms = {
    revenueSharePercent: profile?.revenue_share_percent ?? null,
    openToRevenueShare: profile?.open_to_revenue_share ?? true,
    openToFreeLoan: profile?.open_to_free_loan ?? true,
  };
  const profileReady = !artistLoading && profile != null;
  const shareOffered = form.revenueShareOffered ?? profileTerms.openToRevenueShare;
  const loanOffered = form.paidLoanOffered ?? profileTerms.openToFreeLoan;
```

In both `duplicateFrom` and `openEdit`, replace the two lines `revenueShareOverride: w.revenueShareOverride != null ? ... ,` and `paidLoanMonthlyGbp: w.paidLoanMonthlyGbp != null ? ... ,` with:

```ts
      revenueShareOffered: w.openToRevenueShareOverride ?? null,
      revenueShareRate: w.revenueShareOverride != null ? String(w.revenueShareOverride) : null,
      paidLoanOffered: w.openToFreeLoanOverride ?? null,
      sizeLoanFees: w.pricing.map((p) =>
        typeof p.paidLoanMonthlyGbp === "number" ? String(p.paidLoanMonthlyGbp) : "",
      ),
```

`applyCopyFromSourceToForm`, "sizes" branch: after `inStorePricing: newSizes.map(() => ""),` add `sizeLoanFees: newSizes.map(() => ""),`. In the "prices" branch, after the `anyShipping` line add:

```ts
      // Paid loan fees come across row by row, like per-size shipping. A row
      // the source leaves blank keeps the form's own fee.
      const nextSizeLoanFees = p.sizes.map((_, i) => {
        const fee = source.pricing[i]?.paidLoanMonthlyGbp;
        return typeof fee === "number" ? String(fee) : (p.sizeLoanFees[i] ?? "");
      });
```

and add `sizeLoanFees: nextSizeLoanFees,` to that branch's returned object, after `sizeShipping`.

`bulkEditApplyToTargets`, "prices" branch: after the `if (sourceRow?.shippingPrice != null) { ... }` block add:

```ts
        if (sourceRow?.paidLoanMonthlyGbp != null) {
          next.paidLoanMonthlyGbp = sourceRow.paidLoanMonthlyGbp;
        }
```

`addSize`: add `sizeLoanFees: [...p.sizes.map((_, j) => p.sizeLoanFees[j] ?? ""), ""],` to the returned object.
`removeSize`: add `sizeLoanFees: p.sizeLoanFees.filter((_, j) => j !== index),` to the returned object.

After `removeSize`, add one updater both layouts share:

```ts
  function updateLoanFee(index: number, value: string) {
    setForm((p) => {
      const updated = p.sizes.map((_, j) => p.sizeLoanFees[j] ?? "");
      updated[index] = value;
      return { ...p, sizeLoanFees: updated };
    });
  }
```

- [ ] **Step 5: The paid loan tick and the fee column**

In the column toggles row, after the "Different quantity per size" `</label>`:

```tsx
                {/* Spec 2026-09-13 (per-size loan fees). Offers this work on paid
                    loan and shows a fee column. Starts from the profile. */}
                <label className={`flex items-center gap-2 ${profileReady ? "cursor-pointer" : "opacity-60"}`}>
                  <input
                    type="checkbox"
                    checked={loanOffered}
                    disabled={!profileReady}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((p) => ({ ...p, paidLoanOffered: checked }));
                    }}
                    className="w-3.5 h-3.5 rounded-sm border border-border accent-accent"
                  />
                  <span className="text-xs text-muted px-1.5 py-0.5 rounded-sm bg-accent/10">Offer on paid loan</span>
                </label>
```

Desktop grid. In `cols`, delete `form.inStoreEnabled   ? "110px" : null,`: no header or row cell renders for it since the in-store price model was retired, so turning on "Available to buy in store" pushed every later cell one column left, which would misplace the fee column too. After `form.stockPerSize     ? "90px"  : null,` add:

```ts
                  loanOffered           ? "120px" : null, // Paid loan fee, migration 149
```

In the header row, after `{form.stockPerSize && <div className="text-right pr-1">Qty</div>}`:

```tsx
                      {loanOffered && <div className="text-right pr-1 py-1 rounded-sm bg-accent/10">Paid loan / month</div>}
```

In each row, after the `{form.stockPerSize && ( ... )}` cell and before the remove-button cell:

```tsx
                            {loanOffered && (
                              <div className="flex items-center gap-1 justify-end rounded-sm bg-accent/10 px-1.5 py-1">
                                <span className="text-xs text-muted">£</span>
                                <input
                                  type="number"
                                  min={PAID_LOAN_MIN_GBP}
                                  step="0.01"
                                  value={form.sizeLoanFees[i] ?? ""}
                                  onChange={(e) => updateLoanFee(i, e.target.value)}
                                  placeholder="None"
                                  aria-label={`Paid loan fee a month for ${size.label || `size ${i + 1}`}`}
                                  className="w-[80px] bg-background border border-border rounded-sm px-2 py-2 text-sm text-right focus:outline-none focus:border-accent/60"
                                />
                              </div>
                            )}
```

Mobile cards. Inside `<div className="grid grid-cols-2 gap-2 mt-2">`, after the `{form.shippingPerSize && ( ... )}` label:

```tsx
                        {loanOffered && (
                          <label className="flex flex-col gap-1 rounded-sm bg-accent/10 p-1.5">
                            <span className="text-[10px] text-muted uppercase tracking-wider">Paid loan / month</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted">£</span>
                              <input
                                type="number"
                                min={PAID_LOAN_MIN_GBP}
                                step="0.01"
                                value={form.sizeLoanFees[i] ?? ""}
                                onChange={(e) => updateLoanFee(i, e.target.value)}
                                placeholder="None"
                                aria-label={`Paid loan fee a month for ${size.label || `size ${i + 1}`}`}
                                className="w-full bg-background border border-border rounded-sm px-2 py-2 text-sm focus:outline-none focus:border-accent/60"
                              />
                            </div>
                          </label>
                        )}
```

Replace the hint under the table ("Set a price for each size. Enable the toggles above to add per-size shipping or in-store prices as extra columns.") with:

```tsx
                Set a price for each size. The ticks above add columns for shipping, quantity and paid loan fees by size. A blank fee lists no price for that size.
```

- [ ] **Step 6: The revenue share tick**

Replace the whole block from `{/* Placement terms for this work (migration 148).` to its closing `)}`, just above `{/* Available toggle */}`, with:

```tsx
            {/* Placement terms for this work (spec 2026-09-13, per-size loan
                fees). Paid loan sits with the sizes above because its fee can
                differ by size; revenue share is one rate for the whole work. */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm font-medium">Placement terms for this work</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className={`flex items-center gap-2 sm:w-52 shrink-0 ${profileReady ? "cursor-pointer" : "opacity-60"}`}>
                  <input
                    type="checkbox"
                    checked={shareOffered}
                    disabled={!profileReady}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((p) => ({ ...p, revenueShareOffered: checked }));
                    }}
                    className="w-3.5 h-3.5 rounded-sm border border-border accent-accent"
                  />
                  <span className="text-sm">Offer on revenue share</span>
                </label>
                {shareOffered && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      disabled={!profileReady}
                      value={
                        form.revenueShareRate ??
                        (profileTerms.revenueSharePercent != null ? String(profileTerms.revenueSharePercent) : "")
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((p) => ({ ...p, revenueShareRate: value }));
                      }}
                      aria-label="Revenue share for this work, %"
                      className="w-20 bg-background border border-border rounded-sm px-3 py-2 text-sm text-right focus:outline-none focus:border-accent/60"
                    />
                    <span className="text-sm text-muted">%</span>
                    {form.revenueShareRate === null && profileTerms.revenueSharePercent != null && (
                      <span className="text-xs text-muted ml-2">Your profile rate</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted">These don&rsquo;t change placements you&rsquo;ve already agreed.</p>
            </div>
```

- [ ] **Step 7: Save**

In `handleSubmit`, replace the migration 148 block (the comment, `const terms = parseWorkTermsForm(...)` and its `if (!terms.ok)` guard) with:

```ts
    // Spec 2026-09-13 (per-size loan fees). Same ranges as the database; a work
    // stores only what differs from the profile, so untouched settings follow it.
    const terms = parseWorkArrangements(
      {
        revenueShareOffered: form.revenueShareOffered,
        revenueShareRate: form.revenueShareRate,
        paidLoanOffered: form.paidLoanOffered,
        loanFees: form.sizes.map((_, i) => form.sizeLoanFees[i] ?? ""),
      },
      profileTerms,
    );
    if (!terms.ok) {
      setFormError(terms.error);
      return;
    }
```

In the `pricing: validSizes.map(...)` callback, add `paidLoanMonthlyGbp?: number;` to the `base` type, and directly before `return base;`:

```ts
        // Migration 149: this size's paid loan fee. Kept while paid loan is
        // unticked, so ticking it again later brings the fees back.
        const loanFee = terms.loanFees[formIdx];
        if (typeof loanFee === "number") base.paidLoanMonthlyGbp = loanFee;
```

In `newWork`, replace `revenueShareOverride: terms.revenueShareOverride,` and `paidLoanMonthlyGbp: terms.paidLoanMonthlyGbp,` with:

```ts
      revenueShareOverride: terms.revenueShareOverride,
      openToRevenueShareOverride: terms.openToRevenueShareOverride,
      openToFreeLoanOverride: terms.openToFreeLoanOverride,
```

In the POST body inside the save, replace the migration 148 comment and its two keys with:

```ts
              // Migrations 148 and 149. undefined drops out of JSON, so the route
              // leaves the stored value alone; null returns it to the profile.
              // Per-size fees travel inside `pricing`.
              revenueShareOverride: work.revenueShareOverride,
              openToRevenueShareOverride: work.openToRevenueShareOverride,
              openToFreeLoanOverride: work.openToFreeLoanOverride,
```

- [ ] **Step 8: Run the tests, the type check and lint**

Run: `npx vitest run "src/app/(pages)/artist-portal" src/components/portfolio && npx tsc --noEmit && npx eslint src/components/portfolio/WorksEditor.tsx`
Expected: PASS, with no new lint errors. The profile page test mounts the same editor without a profile, so its ticks stay disabled and its tests are unaffected.

- [ ] **Step 9: Commit**

```bash
git add src/components/portfolio/WorksEditor.tsx "src/app/(pages)/artist-portal/portfolio/page.test.tsx"
git commit -m "Work editor: arrangement ticks that follow the profile, and a paid loan fee column per size"
```

### Task 6: The artist placement forms

**Files:**
- Modify: `website/src/components/SpacesPlacementRequestForm.tsx` (local `ArtistWork` type near line 62, `@/lib/work-terms` import, `suggestedTerms` near line 183)
- Modify: `website/src/app/(pages)/spaces/page.tsx` (`ArtistWorkLite`, line 23)
- Modify: `website/src/components/visualizer/WorksPanel.tsx` (`PanelWork`, line 36)
- Modify: `website/src/components/visualizer/WallVisualizer.tsx` (`proposalInitialTerms` near line 499, `normaliseWork` near line 1663)
- Modify: `website/src/app/(pages)/artist-portal/placements/page.tsx` (`suggestedTerms` near line 254, `workSizes` near line 265)
- Test: `website/src/components/SpacesPlacementRequestForm.test.tsx`

**Interfaces:**
- Consumes: `initialPlacementTerms`, `workTermsSourceFromRow`, `LoanFeeSize` (Task 2); `ArtistTermsPayload` from `GET /api/artist-works`, which already carries both profile ticks.
- Produces: `PanelWork` gains `openToRevenueShareOverride`, `openToFreeLoanOverride` and `pricing?: LoanFeeSize[]`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe("SpacesPlacementRequestForm starts from the work's terms (spec 2026-09-13)", ...)`:

```tsx
  it("opens the monthly fee at the work's lowest listed size fee, since no size is chosen here", () => {
    renderWith(
      [
        {
          ...WORKS[0],
          pricing: [
            { label: "A4", price: 100, paidLoanMonthlyGbp: 60 },
            { label: "A3", price: 200, paidLoanMonthlyGbp: 40 },
          ],
        },
      ],
      TERMS,
    );
    fireEvent.click(screen.getByTitle("Paid loan"));
    expect((screen.getByLabelText("Monthly fee from venue") as HTMLInputElement).value).toBe("40");
  });

  it("keeps the form's own share for a work switched off revenue share", () => {
    renderWith([{ ...WORKS[0], revenue_share_percent: 30, open_to_revenue_share: false }], TERMS);
    expect(shareInput().value).toBe("25");
  });
```

- [ ] **Step 2: Run them and watch the fee test fail**

Run: `npx vitest run src/components/SpacesPlacementRequestForm.test.tsx`
Expected: the fee test FAILS with "25" (the form's own default), because the form never reads `pricing`. The share test already passes on Task 2's reader and pins it.

- [ ] **Step 3: Spaces form and page**

In `SpacesPlacementRequestForm.tsx`, replace the migration 148 fields of the local `ArtistWork` type with:

```ts
  /** Raw artist_works columns (migrations 148 and 149), as GET /api/artist-works returns them. */
  revenue_share_percent?: number | string | null;
  open_to_revenue_share?: boolean | null;
  open_to_free_loan?: boolean | null;
  /** Raw pricing tiers; each may carry its own paidLoanMonthlyGbp. */
  pricing?: unknown;
```

In its `@/lib/work-terms` import replace `workTermsFromRow` with `workTermsSourceFromRow`, then replace the `suggestedTerms` memo with:

```ts
  const suggestedTerms = useMemo(
    () =>
      initialPlacementTerms(
        // Per-size loan fees spec: no size is chosen in this form, so each work
        // starts from its lowest listed fee.
        selectedWorks.map((w) => workTermsSourceFromRow(w as unknown as Record<string, unknown>)),
        {
          revenueSharePercent: artistTerms?.revenueSharePercent ?? null,
          openToRevenueShare: artistTerms?.openToRevenueShare ?? true,
          openToFreeLoan: artistTerms?.openToFreeLoan ?? true,
        },
      ),
    [selectedWorks, artistTerms],
  );
```

In `src/app/(pages)/spaces/page.tsx`, replace `paid_loan_monthly_gbp?: number | string | null;` in `ArtistWorkLite` with:

```ts
  open_to_revenue_share?: boolean | null;
  open_to_free_loan?: boolean | null;
  pricing?: unknown;
```

- [ ] **Step 4: Visualiser**

In `WorksPanel.tsx`, add `import type { LoanFeeSize } from "@/lib/work-terms";` and replace the migration 148 comment and two fields of `PanelWork` with:

```ts
  /** The work's own terms (migrations 148 and 149), read through src/lib/work-terms.ts. */
  revenueShareOverride?: number | null;
  openToRevenueShareOverride?: boolean | null;
  openToFreeLoanOverride?: boolean | null;
  /** Each size's listed monthly paid loan fee. */
  pricing?: LoanFeeSize[];
  /** Migration 148's single fee. Removed in task 11. */
  paidLoanMonthlyGbp?: number | null;
```

In `WallVisualizer.tsx`, replace `workTermsFromRow` with `workTermsSourceFromRow` in the `@/lib/work-terms` import and in `normaliseWork` (`...workTermsSourceFromRow(raw),`). Replace the `proposalInitialTerms` memo with:

```ts
  // Spec 2026-09-13. Wall order, so the first work matches the proposal's
  // primary work in buildProposalPlacement. Each fee follows the size placed on
  // the wall (per-size loan fees spec).
  const proposalInitialTerms = useMemo(
    () =>
      initialPlacementTerms(
        items
          .map((item) => {
            const work = workById[item.work_id];
            return work ? { ...work, sizeLabel: item.size_label ?? null } : null;
          })
          .filter((w): w is PanelWork & { sizeLabel: string | null } => w !== null),
        {
          revenueSharePercent: artistTerms?.revenueSharePercent ?? null,
          openToRevenueShare: artistTerms?.openToRevenueShare ?? true,
          openToFreeLoan: artistTerms?.openToFreeLoan ?? true,
        },
      ),
    [items, workById, artistTerms],
  );
```

- [ ] **Step 5: Artist portal form**

In `src/app/(pages)/artist-portal/placements/page.tsx`, move the line `const [workSizes, setWorkSizes] = useState<Record<number, string>>({});` up to directly above `const suggestedTerms = useMemo(`. The memo now reads it, and a `const` read before its declaration throws during render. Then replace the memo with:

```ts
  const suggestedTerms = useMemo(
    () =>
      initialPlacementTerms(
        Array.from(selectedWorks)
          .map((i) => {
            const work = artist?.works[i];
            // Per-size loan fees spec: the fee follows the size picked for each
            // work, or its lowest listed fee for "Any size".
            return work ? { ...work, sizeLabel: workSizes[i] || null } : null;
          })
          .filter((w): w is NonNullable<typeof w> => w !== null),
        {
          revenueSharePercent: artist?.revenueSharePercent ?? null,
          openToRevenueShare: artist?.openToRevenueShare ?? true,
          openToFreeLoan: artist?.openToFreeLoan ?? true,
        },
      ),
    [selectedWorks, workSizes, artist],
  );
```

- [ ] **Step 6: Run the tests and the type check**

Run: `npx vitest run src/components/SpacesPlacementRequestForm.test.tsx src/components/visualizer && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/SpacesPlacementRequestForm.tsx src/components/SpacesPlacementRequestForm.test.tsx "src/app/(pages)/spaces/page.tsx" src/components/visualizer/WorksPanel.tsx src/components/visualizer/WallVisualizer.tsx "src/app/(pages)/artist-portal/placements/page.tsx"
git commit -m "Artist placement forms: start from each work's ticks and the fee for its size"
```

### Task 7: The venue placement form

**Files:**
- Create: `website/src/app/(pages)/venue-portal/placements/venue-starting-terms.ts`
- Test: `website/src/app/(pages)/venue-portal/placements/venue-starting-terms.test.ts`
- Modify: `website/src/app/(pages)/venue-portal/placements/page.tsx`

**Interfaces:**
- Consumes: `initialPlacementTerms`, `ArtistTermsInput`, `WorkTermsInput`, `MIXED_TERMS_NOTE` (Task 2). `/api/browse-artists` already carries each work's overrides and pricing, and the artist's rate and ticks.
- Produces: `venueStartingTerms(works, selectedWorkSizes, artist): InitialPlacementTerms`. The page reads a `size` URL parameter, which Task 8 sends.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { venueStartingTerms } from "./venue-starting-terms";

const artist = { revenueSharePercent: 20, openToRevenueShare: true, openToFreeLoan: true };
const harbour = {
  title: "Harbour Light",
  revenueShareOverride: 30,
  pricing: [
    { label: "A4", price: 100, paidLoanMonthlyGbp: 25 },
    { label: "A2", price: 300, paidLoanMonthlyGbp: 55 },
  ],
};
const tide = { title: "Second Tide", pricing: [{ label: "A4", price: 90, paidLoanMonthlyGbp: 30 }] };

describe("venueStartingTerms", () => {
  it("starts from the chosen size's fee and the work's own share", () => {
    expect(venueStartingTerms([harbour, tide], { "Harbour Light": "A2" }, artist))
      .toEqual({ revenueSharePercent: 30, monthlyFeeGbp: 55, mixed: false });
  });

  it("uses the lowest listed fee for Any size", () => {
    expect(venueStartingTerms([harbour], { "Harbour Light": "" }, artist).monthlyFeeGbp).toBe(25);
  });

  it("follows the order the venue ticked works in, and totals their fees", () => {
    expect(venueStartingTerms([harbour, tide], { "Second Tide": "", "Harbour Light": "A4" }, artist))
      .toEqual({ revenueSharePercent: 20, monthlyFeeGbp: 55, mixed: true });
  });

  it("ignores a ticked title the artist's works no longer include", () => {
    expect(venueStartingTerms([tide], { "Gone Work": "", "Second Tide": "" }, artist))
      .toEqual({ revenueSharePercent: 20, monthlyFeeGbp: 30, mixed: false });
  });

  it("keeps the form's own defaults when nothing is ticked", () => {
    expect(venueStartingTerms([harbour], {}, artist)).toEqual({ revenueSharePercent: null, monthlyFeeGbp: null, mixed: false });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run "src/app/(pages)/venue-portal/placements/venue-starting-terms.test.ts"`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write the helper**

```ts
/**
 * Where a venue's own placement request starts (spec 2026-09-13, per-size loan
 * fees). The venue ticks works on an artist's page and may pick a size for
 * each; the request opens at those works' advertised terms instead of a flat 0%
 * and £50. Kept out of the page so it can be tested without rendering it.
 */
import {
  initialPlacementTerms,
  type ArtistTermsInput,
  type InitialPlacementTerms,
  type WorkTermsInput,
} from "@/lib/work-terms";

export interface VenueRequestWork extends WorkTermsInput {
  title: string;
}

/**
 * @param selectedWorkSizes each ticked work's title and chosen size ("" for any
 *   size), in the order the venue ticked them, which is the order the request
 *   lists them.
 */
export function venueStartingTerms(
  works: ReadonlyArray<VenueRequestWork>,
  selectedWorkSizes: Readonly<Record<string, string>>,
  artist: ArtistTermsInput,
): InitialPlacementTerms {
  const selections = Object.entries(selectedWorkSizes).flatMap(([title, size]) => {
    const work = works.find((w) => w.title === title);
    return work ? [{ ...work, sizeLabel: size || null }] : [];
  });
  return initialPlacementTerms(selections, artist);
}
```

Run: `npx vitest run "src/app/(pages)/venue-portal/placements/venue-starting-terms.test.ts"`
Expected: PASS.

- [ ] **Step 4: Wire it into the page**

All edits in `src/app/(pages)/venue-portal/placements/page.tsx`.

Imports: change the React import to `import React, { useState, useEffect, useMemo } from "react";` and add:

```ts
import { MIXED_TERMS_NOTE, type ArtistTermsInput } from "@/lib/work-terms";
import { venueStartingTerms } from "./venue-starting-terms";
```

In `interface ArtistWork`, replace `pricing?: { label: string; price: number }[];` with:

```ts
  pricing?: { label: string; price: number; paidLoanMonthlyGbp?: number | null }[];
  /** The work's own terms (migrations 148 and 149), from /api/browse-artists. */
  revenueShareOverride?: number | null;
  openToRevenueShareOverride?: boolean | null;
  openToFreeLoanOverride?: boolean | null;
```

After `const [artistWorks, setArtistWorks] = useState<ArtistWork[]>([]);` add:

```ts
  const [artistTerms, setArtistTerms] = useState<ArtistTermsInput>({});
```

Replace `const [revenuePercent, setRevenuePercent] = useState<number | "">(0);` with:

```ts
  // Per-size loan fees spec: the share starts at the ticked works' advertised
  // terms until the venue types its own; null means not typed yet.
  const [revenuePercentInput, setRevenuePercentInput] = useState<number | "" | null>(null);
  const startingTerms = useMemo(
    () => venueStartingTerms(artistWorks, selectedWorkSizes, artistTerms),
    [artistWorks, selectedWorkSizes, artistTerms],
  );
  const revenuePercent: number | "" = revenuePercentInput ?? startingTerms.revenueSharePercent ?? 0;
```

Replace the four remaining setter calls: `setRevenuePercent(0);` in the post-submit reset becomes `setRevenuePercentInput(null);`, and in the revenue share input `setRevenuePercent("")`, `setRevenuePercent(Math.max(...))` and the `onBlur` `setRevenuePercent(0)` become `setRevenuePercentInput(...)` with the same arguments. Check with `grep -n "setRevenuePercent(" "src/app/(pages)/venue-portal/placements/page.tsx"`, which must print nothing.

URL size. In the URL-params effect, after `const paramWorks = searchParams.get("works");` add `const paramSize = searchParams.get("size");`, and replace:

```ts
        for (const t of titles) next[t] = "";
        setSelectedWorkSizes(next);
        // Only auto-pop the size picker on a single-work entry; with
        // multiple it just clutters the screen.
        if (titles.length === 1) setSizePickerFor(titles[0]);
```

with:

```ts
        for (const t of titles) next[t] = "";
        // The work page passes the size the visitor had selected.
        if (titles.length === 1 && paramSize) next[titles[0]] = paramSize;
        setSelectedWorkSizes(next);
        // Only auto-pop the size picker on a single-work entry with no size
        // chosen yet; with multiple it just clutters the screen.
        if (titles.length === 1 && !paramSize) setSizePickerFor(titles[0]);
```

In `loadArtistWorks`, replace the `setArtistWorks(artist.works.map(...))` call with:

```ts
        setArtistWorks(artist.works.map((w: ArtistWork) => ({
          id: w.id,
          title: w.title,
          image: w.image,
          medium: w.medium,
          priceBand: w.priceBand,
          dimensions: w.dimensions,
          pricing: Array.isArray(w.pricing) ? w.pricing : undefined,
          revenueShareOverride: w.revenueShareOverride ?? null,
          openToRevenueShareOverride: w.openToRevenueShareOverride ?? null,
          openToFreeLoanOverride: w.openToFreeLoanOverride ?? null,
        })));
        setArtistTerms({
          revenueSharePercent: artist.revenueSharePercent ?? null,
          openToRevenueShare: artist.openToRevenueShare ?? true,
          openToFreeLoan: artist.openToFreeLoan ?? true,
        });
```

In the Paid loan checkbox `onChange`, replace `setMonthlyFee(50);` with `setMonthlyFee(startingTerms.monthlyFeeGbp ?? 50);`, and start its comment with: "Seed the ticked works' listed fees for their chosen sizes, or £50 when none is listed, the first time the user turns paid loan on."

Directly above `{/* Revenue share (only relevant when QR is on) */}` add:

```tsx
            {startingTerms.mixed && (qrEnabled || paidLoanEnabled) && (
              <p role="note" className="text-xs text-muted">
                {MIXED_TERMS_NOTE}
              </p>
            )}
```

- [ ] **Step 5: Run the tests, the type check and lint**

Run: `npx vitest run "src/app/(pages)/venue-portal" && npx tsc --noEmit && npx eslint "src/app/(pages)/venue-portal/placements"`
Expected: PASS, with no new lint errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(pages)/venue-portal/placements"
git commit -m "Venue placement form: start from the ticked works' terms and chosen sizes"
```

### Task 8: The public work page

**Files:**
- Create: `website/src/app/(pages)/browse/[slug]/[workSlug]/placement-request-href.ts`
- Test: `website/src/app/(pages)/browse/[slug]/[workSlug]/placement-request-href.test.ts`
- Modify: `website/src/app/(pages)/browse/[slug]/[workSlug]/ArtworkPageClient.tsx` (props, the end of the Size & Price block, the Request Placement button)
- Modify: `website/src/app/(pages)/browse/[slug]/[workSlug]/page.tsx` (the `<ArtworkPageClient>` props, line 181)
- Test: `website/src/app/(pages)/browse/[slug]/[workSlug]/ArtworkPageClient.test.tsx`

**Interfaces:**
- Consumes: `resolveWorkTerms`, `paidLoanFeeForSize`, `ArtistTermsPayload` (Task 2); `WorkTermsLine` with `spacer={false}` (Task 4).
- Produces: `placementRequestHref({ artistSlug, artistName, workTitle, workImage, sizeLabel? })`, whose `size` parameter Task 7 reads. `ArtworkPageClient` takes `artistTerms?: ArtistTermsPayload`.

- [ ] **Step 1: Write the failing tests**

`placement-request-href.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { placementRequestHref } from "./placement-request-href";

describe("placementRequestHref", () => {
  it("links to the venue request form for this work, with the selected size", () => {
    const href = placementRequestHref({
      artistSlug: "alice-rivers",
      artistName: "Alice Rivers",
      workTitle: "Winter Field",
      workImage: "https://example.test/w1.jpg",
      sizeLabel: '12×16" (A3)',
    });
    const url = new URL(href, "https://wallplace.test");
    expect(url.pathname).toBe("/venue-portal/placements");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      artist: "alice-rivers",
      artistName: "Alice Rivers",
      work: "Winter Field",
      workImage: "https://example.test/w1.jpg",
      size: '12×16" (A3)',
    });
  });

  it("leaves the size out when none is selected", () => {
    const href = placementRequestHref({ artistSlug: "a", artistName: "A", workTitle: "W", workImage: "", sizeLabel: null });
    expect(new URL(href, "https://wallplace.test").searchParams.has("size")).toBe(false);
  });
});
```

Append to `ArtworkPageClient.test.tsx`:

```tsx
describe("Artwork page placement terms (per-size loan fees)", () => {
  const TERMS = { revenueSharePercent: 20, openToRevenueShare: true, openToFreeLoan: true };

  function workWithFees(): ArtistWork {
    const w = workWithPerSizeShipping();
    w.pricing = [
      { label: "A4", price: 120, paidLoanMonthlyGbp: 25 },
      { label: "100x80 cm", price: 480, paidLoanMonthlyGbp: 60 },
    ];
    return w;
  }

  it("shows the share and the selected size's own fee, not From", () => {
    render(<ArtworkPageClient work={workWithFees()} artistName="Alice Rivers" artistSlug="alice-rivers" artistTerms={TERMS} />);
    expect(screen.getByText("20% Revenue Share · £25/month Paid Loan")).toBeTruthy();
    expect(screen.queryByText(/From £/)).toBeNull();
  });

  it("follows the size dropdown", () => {
    render(<ArtworkPageClient work={workWithFees()} artistName="Alice Rivers" artistSlug="alice-rivers" artistTerms={TERMS} />);
    fireEvent.click(screen.getByLabelText("Choose size"));
    fireEvent.click(screen.getAllByRole("option")[1]);
    expect(screen.getByText("20% Revenue Share · £60/month Paid Loan")).toBeTruthy();
  });

  it("shows nothing for a work switched off both arrangements", () => {
    const work = { ...workWithFees(), openToRevenueShareOverride: false, openToFreeLoanOverride: false };
    render(<ArtworkPageClient work={work} artistName="Alice Rivers" artistSlug="alice-rivers" artistTerms={TERMS} />);
    expect(screen.queryByText(/Revenue Share|Paid Loan/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run "src/app/(pages)/browse/[slug]/[workSlug]"`
Expected: FAIL. The helper does not exist and the page shows no terms.

- [ ] **Step 3: Implement**

`placement-request-href.ts`:

```ts
/**
 * The venue's "Request Placement" link from a work page. It carries the size
 * the visitor has selected, so the request opens on that size's fee (spec
 * 2026-09-13, per-size loan fees).
 */
export function placementRequestHref(input: {
  artistSlug: string;
  artistName: string;
  workTitle: string;
  workImage: string;
  sizeLabel?: string | null;
}): string {
  const params = new URLSearchParams({
    artist: input.artistSlug,
    artistName: input.artistName,
    work: input.workTitle,
    workImage: input.workImage,
  });
  if (input.sizeLabel) params.set("size", input.sizeLabel);
  return `/venue-portal/placements?${params.toString()}`;
}
```

`ArtworkPageClient.tsx`. Add imports:

```ts
import WorkTermsLine from "@/components/WorkTermsLine";
import { paidLoanFeeForSize, resolveWorkTerms, type ArtistTermsPayload } from "@/lib/work-terms";
import { placementRequestHref } from "./placement-request-href";
```

Add to `ArtworkPageClientProps`, and `artistTerms,` to the destructured props:

```ts
  /** The artist's profile rate and ticks, which a work follows until it sets
   *  its own. Drives the terms line under Size & Price. */
  artistTerms?: ArtistTermsPayload;
```

Directly after `const selectedPricing = work.pricing[selectedSizeIdx] || work.pricing[0];`:

```ts
  // Per-size loan fees spec: the Galleries card's orange line for the size the
  // visitor has selected, so the fee is that size's own rather than "From".
  const workTerms = resolveWorkTerms(work, artistTerms ?? {});
  const selectedLoanFee = workTerms.openToFreeLoan ? paidLoanFeeForSize(work, selectedPricing?.label) : null;
```

At the end of the Size & Price block, replace:

```tsx
            </>
          )}
        </div>
      )}

      {/* Frame selector */}
```

with:

```tsx
            </>
          )}
          <WorkTermsLine
            openToRevenueShare={workTerms.openToRevenueShare}
            revenueSharePercent={workTerms.revenueSharePercent}
            openToFreeLoan={workTerms.openToFreeLoan}
            paidLoanFromGbp={selectedLoanFee}
            spacer={false}
          />
        </div>
      )}

      {/* Frame selector */}
```

In the Request Placement button, replace the template-string argument of `router.push(...)` with:

```tsx
                placementRequestHref({
                  artistSlug,
                  artistName,
                  workTitle: work.title,
                  workImage: work.image,
                  sizeLabel: selectedPricing?.label,
                }),
```

`page.tsx`, add to the `<ArtworkPageClient>` props:

```tsx
                artistTerms={{
                  revenueSharePercent: artist.revenueSharePercent ?? null,
                  openToRevenueShare: artist.openToRevenueShare,
                  openToFreeLoan: artist.openToFreeLoan,
                }}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run "src/app/(pages)/browse/[slug]/[workSlug]" && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(pages)/browse/[slug]/[workSlug]"
git commit -m "Work page: terms line for the selected size, and pass the size to the venue request"
```

### Task 9: The profile's deal types

**Files:**
- Modify: `website/src/app/(pages)/artist-portal/profile/page.tsx` (imports, the Deal types grid near line 909, the revenue share field near line 947)
- Test: `website/src/app/(pages)/artist-portal/profile/page.test.tsx`

**Interfaces:**
- Consumes: `ARRANGEMENT_LABEL` from `@/lib/arrangement-labels`.
- Produces: the profile saves `open_to_revenue_share` from a visible tick box. Nothing else changes in the save body.

- [ ] **Step 1: Write the failing tests**

Add `within` to the `@testing-library/react` import, then append:

```tsx
describe("Deal types use the application form's words (per-size loan fees spec)", () => {
  const dealTypes = () => screen.getByText("Deal types").closest("div") as HTMLElement;
  const toggleFor = (label: string) => {
    const row = within(dealTypes()).getByText(label).closest("label");
    if (!row) throw new Error(`${label} is not inside a toggle row`);
    return row.querySelector("button") as HTMLButtonElement;
  };

  it("offers Revenue share, Paid loan and Direct purchase, and says works start from them", async () => {
    render(<ProfileEditorPage />);
    await screen.findByText("Deal types");
    for (const label of ["Revenue share", "Paid loan", "Direct purchase"]) {
      expect(within(dealTypes()).getByText(label)).toBeTruthy();
    }
    expect(within(dealTypes()).queryByText("Display (with optional revenue share)")).toBeNull();
    expect(screen.getByText(/Every work starts with these/)).toBeTruthy();
  });

  it("shows the rate only while Revenue share is ticked, and saves the tick", async () => {
    // artists[0] (James Okafor) is open to paid loan but not to revenue share.
    render(<ProfileEditorPage />);
    await screen.findByText("Deal types");
    expect(screen.queryByText("Revenue share for venues (%)")).toBeNull();

    fireEvent.click(toggleFor("Revenue share"));
    expect(screen.getByText("Revenue share for venues (%)")).toBeTruthy();

    fireEvent.click(screen.getAllByText("Save Changes")[0]);
    await waitFor(() => expect(mutateMock).toHaveBeenCalled());
    const body = JSON.parse((mutateMock.mock.calls.at(-1)?.[1] as { body: string }).body);
    expect(body.open_to_revenue_share).toBe(true);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run "src/app/(pages)/artist-portal/profile/page.test.tsx"`
Expected: the new tests FAIL; the existing ones PASS.

- [ ] **Step 3: Implement**

Add `import { ARRANGEMENT_LABEL } from "@/lib/arrangement-labels";`.

In the Deal types group, change `<div className="grid grid-cols-2 gap-3">` to `<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">`, and replace the first two option entries (`openToFreeLoan` labelled "Display (with optional revenue share)" and `openToOutrightPurchase` labelled "Purchase") with:

```tsx
                // Per-size loan fees spec: the application form's words, so the
                // boxes an artist ticked when applying read the same here. Each
                // work starts from these and can set its own.
                { key: "openToRevenueShare" as const, label: ARRANGEMENT_LABEL.revenue_share, wide: false },
                { key: "openToFreeLoan" as const, label: ARRANGEMENT_LABEL.paid_loan, wide: false },
                { key: "openToOutrightPurchase" as const, label: ARRANGEMENT_LABEL.purchase, wide: false },
```

Keep the Programmes entry and its comment. In the row's `className`, change `" col-span-2"` to `" col-span-2 sm:col-span-3"`. After the grid's closing `</div>` and before the Programmes paragraph, add:

```tsx
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Every work starts with these. You can change them on any work, and a work you&rsquo;ve changed keeps its own setting.
            </p>
```

In the revenue share field, change `{profile.openToFreeLoan && (` to `{profile.openToRevenueShare && (`, and replace its description ("Optional: the % you offer venues on sales from their space. Leave at 0 for a pure free display.") with:

```tsx
The share venues earn on sales from their wall. Each work starts at this rate, and you can change it on any work.
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run "src/app/(pages)/artist-portal/profile" && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(pages)/artist-portal/profile"
git commit -m "Profile deal types: Revenue share, Paid loan and Direct purchase, as on the application"
```

### Task 10: The sample catalogue

**Files:**
- Modify: `website/src/data/artists.ts` (nine sample works)
- Test: `website/src/data/seed-terms.test.ts`

**Interfaces:**
- Consumes: `resolveWorkTerms` (Task 2).
- Produces: sample works that show every card state: "From" fees, a single fee, a work switched on by an artist whose profile says no, and ticks switched off.

- [ ] **Step 1: Write the failing test**

Replace `src/data/seed-terms.test.ts` with:

```ts
// Sample per-work terms (specs 2026-09-13). The seed catalogue is what shows the
// card line off, so its data has to be a state the product could really hold:
// the database's fee range, fees only where paid loan is offered, and ticks
// changed in both directions so every state of the card can be seen.
import { describe, expect, it } from "vitest";
import { artists } from "./artists";
import { PAID_LOAN_MIN_GBP } from "@/lib/pricing";
import { resolveWorkTerms } from "@/lib/work-terms";

const works = artists.flatMap((artist) =>
  artist.works.map((work) => ({ artist, work, terms: resolveWorkTerms(work, artist) })),
);
const withFees = works.filter(({ work }) => work.pricing.some((size) => size.paidLoanMonthlyGbp != null));

describe("seed catalogue per-work terms", () => {
  it("lists fees on several works, some differing by size and some not", () => {
    expect(withFees.length).toBeGreaterThanOrEqual(5);
    expect(works.some(({ terms }) => terms.paidLoanFeesVary)).toBe(true);
    expect(works.some(({ terms }) => terms.paidLoanFromGbp !== null && !terms.paidLoanFeesVary)).toBe(true);
  });

  it("lists fees only on works offered on paid loan, within the floor and cap", () => {
    for (const { work, terms } of withFees) {
      expect(terms.openToFreeLoan, work.id).toBe(true);
      for (const size of work.pricing) {
        if (size.paidLoanMonthlyGbp == null) continue;
        expect(size.paidLoanMonthlyGbp, work.id).toBeGreaterThanOrEqual(PAID_LOAN_MIN_GBP);
        expect(size.paidLoanMonthlyGbp, work.id).toBeLessThanOrEqual(100_000);
      }
    }
  });

  it("changes a tick in each direction somewhere", () => {
    expect(works.some(({ artist, work }) => work.openToFreeLoanOverride === true && !artist.openToFreeLoan)).toBe(true);
    expect(works.some(({ artist, work }) => work.openToFreeLoanOverride === false && artist.openToFreeLoan)).toBe(true);
    expect(works.some(({ artist, work }) => work.openToRevenueShareOverride === false && artist.openToRevenueShare)).toBe(true);
  });

  it("sets a work's own rate only where revenue share is offered, as a whole number from 1 to 100", () => {
    const own = works.filter(({ work }) => work.revenueShareOverride != null);
    expect(own.length).toBeGreaterThanOrEqual(1);
    for (const { work, terms } of own) {
      expect(terms.openToRevenueShare, work.id).toBe(true);
      expect(Number.isInteger(work.revenueShareOverride), work.id).toBe(true);
      expect(work.revenueShareOverride!, work.id).toBeGreaterThanOrEqual(1);
      expect(work.revenueShareOverride!, work.id).toBeLessThanOrEqual(100);
    }
  });

  it("carries no retired work-level fee", () => {
    for (const { work } of works) {
      expect((work as { paidLoanMonthlyGbp?: unknown }).paidLoanMonthlyGbp, work.id).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/data/seed-terms.test.ts`
Expected: FAIL. No size lists a fee, no tick is changed, and eight works still carry the work-level fee.

- [ ] **Step 3: Move the sample fees onto sizes**

The card each work will show, for the eye check in Task 12:

| Work | Fees by size (A4, A3, A2, 50×70) | Change | Orange line |
|---|---|---|---|
| james-okafor-1 | 30, 40, 55, 70 | | From £30/month Paid Loan |
| james-okafor-2 | 30, 30, 30, 30 | | £30/month Paid Loan |
| priya-sharma-1 | 35, 45, 60, 80 | | 15% Revenue Share · From £35/month Paid Loan |
| priya-sharma-2 | 35, 35, 35, 35 | revenue share off | £35/month Paid Loan |
| tom-hadley-1 | none | paid loan off | 10% Revenue Share |
| tom-hadley-2 | 25, 30, 40, 50 | keeps its 20% | 20% Revenue Share · From £25/month Paid Loan |
| ravi-patel-1 | 60, 60, 60, 60 | | 15% Revenue Share · £60/month Paid Loan |
| marcus-webb-1 | 22.5, 30, 45, 60 | | 12% Revenue Share · From £22.50/month Paid Loan |
| sofia-ruiz-1 | 20, 30, 40, 55 | paid loan on, profile says no | 20% Revenue Share · From £20/month Paid Loan |

Run from `website/`:

```bash
python3 - <<'PY'
import io, re
path = "src/data/artists.ts"
s = io.open(path, encoding="utf-8").read()

# work id: (fee per size in pricing order, or None for no fees; ticks to add)
SAMPLES = {
    "james-okafor-1": ([30, 40, 55, 70], {}),
    "james-okafor-2": ([30, 30, 30, 30], {}),
    "priya-sharma-1": ([35, 45, 60, 80], {}),
    "priya-sharma-2": ([35, 35, 35, 35], {"openToRevenueShareOverride": "false"}),
    "tom-hadley-1": (None, {"openToFreeLoanOverride": "false"}),
    "tom-hadley-2": ([25, 30, 40, 50], {}),
    "ravi-patel-1": ([60, 60, 60, 60], {}),
    "marcus-webb-1": ([22.5, 30, 45, 60], {}),
    "sofia-ruiz-1": ([20, 30, 40, 55], {"openToFreeLoanOverride": "true"}),
}

for work_id, (fees, ticks) in SAMPLES.items():
    start = s.index(f'id: "{work_id}",')
    end = s.index("\n      },", start)
    block = re.sub(r"\n        paidLoanMonthlyGbp: [\d.]+,", "", s[start:end])
    if fees is not None:
        line = re.search(r"pricing: \[.*\],", block).group(0)
        entries = re.findall(r"\{ label: .*? \}", line)
        assert len(entries) == len(fees), (work_id, len(entries))
        sized = [e[:-2] + f", paidLoanMonthlyGbp: {fee:g} }}" for e, fee in zip(entries, fees)]
        block = block.replace(line, "pricing: [" + ", ".join(sized) + "],")
    for key, value in ticks.items():
        block += f"\n        {key}: {value},"
    s = s[:start] + block + s[end:]

io.open(path, "w", encoding="utf-8").write(s)
print("sample terms moved onto sizes for", len(SAMPLES), "works")
PY
```

Check: `grep -n "^        paidLoanMonthlyGbp:" src/data/artists.ts` prints nothing (no work-level fee left), and `grep -o "paidLoanMonthlyGbp: [0-9.]* }" src/data/artists.ts | wc -l` prints 32 (eight works with four sizes each; the pricing arrays sit on one line, so count matches, not lines).

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/data && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/artists.ts src/data/seed-terms.test.ts
git commit -m "Sample catalogue: per-size loan fees and ticks changed both ways"
```

### Task 11: Retire the work-level fee

**Files:**
- Modify: `website/src/data/artists.ts` (the migration 148 fee field on `ArtistWork`)
- Modify: `website/src/lib/work-terms.ts` (legacy fields, `WorkTermsFormResult`, `parseWorkTermsForm`)
- Modify: `website/src/lib/db/artist-profiles-transform.ts` (`DbArtistWork.paid_loan_monthly_gbp`)
- Modify: `website/src/components/portfolio/changed-works.ts` (`postKey`)
- Modify: `website/src/components/visualizer/WorksPanel.tsx` (legacy `PanelWork` field)
- Test: `src/lib/work-terms.test.ts`, `src/lib/db/artist-profiles-transform.test.ts`, `src/components/portfolio/changed-works.test.ts`

**Interfaces:**
- Produces: no `paidLoanMonthlyGbp` on `ArtistWork`, `WorkTermsInput`, `ResolvedWorkTerms`, `PanelWork` or `workTermsFromRow`'s result. Per-size `SizePricing.paidLoanMonthlyGbp` is the only fee. zod still accepts the work-level key and the route ignores it (Task 3).

- [ ] **Step 1: Update the tests first**

`src/lib/work-terms.test.ts`: delete the `parseWorkTermsForm` describe block and its import, add `type WorkTermsInput` to the import, and add inside `describe("resolveWorkTerms", ...)`:

```ts
  it("ignores the retired work-level fee", () => {
    expect(resolveWorkTerms({ paidLoanMonthlyGbp: 40 } as WorkTermsInput, open)).not.toHaveProperty("paidLoanMonthlyGbp");
    expect(workTermsFromRow({ paid_loan_monthly_gbp: 40 })).not.toHaveProperty("paidLoanMonthlyGbp");
  });
```

`src/lib/db/artist-profiles-transform.test.ts`, replace the migration 148 block with:

```ts
describe("dbProfileToArtist: per-work terms (migration 148)", () => {
  it("keeps a work's own rate separate from the artist's default", () => {
    const artist = dbProfileToArtist(profile, [{ ...row, revenue_share_percent: 30 }]);
    expect(artist.works[0].revenueShareOverride).toBe(30);
    expect(artist.revenueSharePercent).toBe(25);
  });

  it("reads an unset rate as null, which means the default applies", () => {
    expect(dbProfileToArtist(profile, [row]).works[0].revenueShareOverride).toBeNull();
  });

  it("does not carry the retired work-level fee", () => {
    const [work] = dbProfileToArtist(profile, [{ ...row, paid_loan_monthly_gbp: 40 } as unknown as DbArtistWork]).works;
    expect(work).not.toHaveProperty("paidLoanMonthlyGbp");
  });
});
```

`src/components/portfolio/changed-works.test.ts`, in the migration 148 block delete the test "posts a work whose only change is its paid loan fee", and replace the last test with:

```ts
  it("does not post a work whose rate is unchanged, treating missing and null alike", () => {
    expect(worksToPost([w("a", { revenueShareOverride: 30 })], [w("a", { revenueShareOverride: 30 })])).toEqual([]);
    expect(worksToPost([w("b", { revenueShareOverride: null })], [w("b")])).toEqual([]);
  });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/lib/work-terms.test.ts src/lib/db/artist-profiles-transform.test.ts src/components/portfolio/changed-works.test.ts`
Expected: FAIL, the retired fee is still on the resolved terms and the transformed work.

- [ ] **Step 3: Remove the legacy code**

- `src/data/artists.ts`: delete `/** Migration 148. Listed monthly paid loan fee in pounds, or null for none. */` and `paidLoanMonthlyGbp?: number | null;` from `ArtistWork`.
- `src/lib/work-terms.ts`: delete the `paidLoanMonthlyGbp` field and comment from `WorkTermsInput` and `ResolvedWorkTerms`, the `paidLoanMonthlyGbp:` line from `resolveWorkTerms`' return, the `paidLoanMonthlyGbp` entry from `workTermsFromRow`'s return type and object, and the whole `WorkTermsFormResult` type and `parseWorkTermsForm` function with its comment.
- `src/lib/db/artist-profiles-transform.ts`: delete `paid_loan_monthly_gbp` and its comment from `DbArtistWork`.
- `src/components/portfolio/changed-works.ts`: delete `paidLoanMonthlyGbp: work.paidLoanMonthlyGbp ?? null,`, and in the comment above it change "its revenue share or listed paid loan fee" to "its revenue share".
- `src/components/visualizer/WorksPanel.tsx`: delete the legacy `paidLoanMonthlyGbp` field and its comment from `PanelWork`.

- [ ] **Step 4: Check nothing still reads it**

Run: `npx tsc --noEmit`
Expected: PASS. Any error names a leftover reader; switch it to the per-size fee through `work-terms.ts`.

Run: `grep -rn "parseWorkTermsForm\|paid_loan_monthly_gbp" src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'`
Expected: nothing, apart from comments that describe the retired column.

Run: `npx vitest run src tests/integration`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/artists.ts src/lib/work-terms.ts src/lib/work-terms.test.ts src/lib/db/artist-profiles-transform.ts src/lib/db/artist-profiles-transform.test.ts src/components/portfolio/changed-works.ts src/components/portfolio/changed-works.test.ts src/components/visualizer/WorksPanel.tsx
git commit -m "Retire migration 148's work-level loan fee from the code"
```

### Task 12: Gate, look by eye, ship

**Files:** none new. Memory note and PR description outside the repo.

- [ ] **Step 1: The full gate**

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run audit:allowlist
npm run depcheck
```

Expected: lint with 0 errors, and every other command passing.

- [ ] **Step 2: Look by eye on sample data**

Start the `wallspace-dev` preview (the worktree's `.env.local` holds only public values, so only the sample catalogue loads). Check at 1280 and 375 px:
- Galleries: the nine cards in the Task 10 table show their orange lines. sofia-ruiz-1's grey line includes "Paid loan", and tom-hadley-1's does not.
- The Paid Loan filter includes sofia-ruiz-1 and leaves out tom-hadley-1.
- `/browse/sofia-ruiz/market-day-electric-avenue`: the line reads "20% Revenue Share · £20/month Paid Loan" and follows the size dropdown.

The editor and the profile page need a signed-in artist, so their tests stand in for a look. Say so in the PR.

- [ ] **Step 3: Record what was learned**

Update the memory note `project_wallplace_artist_works_save_traps.md`: a CHECK constraint's function needs EXECUTE for the writing role, so never revoke it from `authenticated`; and a new per-size key must be declared in `sizePricingSchema` or zod strips it.

- [ ] **Step 4: Ask the owner before any production write**

One message asking to: apply migration 149 to production; run the rolled-back check below; push `claude/per-size-loan-fees`; open the PR; and merge it with `gh pr merge --auto --merge`. The schema snapshot already lists the new columns, so the migration must be applied before the merge.

- [ ] **Step 5: After approval**

1. Apply with the Supabase MCP `apply_migration`, name `149_work_arrangements_and_size_loan_fees`, SQL copied from the file. Confirm with `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'artist_works' and column_name in ('open_to_revenue_share', 'open_to_free_loan');` (two rows) and `select conname from pg_constraint where conname = 'artist_works_pricing_loan_fees_range';` (one row).
2. Rolled-back check that an artist's own direct update still passes the CHECK, and that a bad fee fails it. Run each as its own `execute_sql` call, since the second is expected to raise:

```sql
begin;
select set_config('test.work_id', (select id from public.artist_works order by created_at limit 1), true);
select set_config('request.jwt.claims', json_build_object(
  'role', 'authenticated',
  'sub', (select p.user_id::text from public.artist_works w join public.artist_profiles p on p.id = w.artist_id
          where w.id = current_setting('test.work_id'))
)::text, true);
set local role authenticated;
update public.artist_works set pricing = pricing where id = current_setting('test.work_id');
rollback;
```

Expected: `UPDATE 1`, then the rollback. Repeat with `set pricing = '[{"label":"A4","price":120,"paidLoanMonthlyGbp":5}]'::jsonb`. Expected: an error naming `artist_works_pricing_loan_fees_range`.

3. `gh auth switch --user fcoles2598`, then `git push -u origin claude/per-size-loan-fees`, `gh pr create --base main` with the description, `gh pr merge <n> --auto --merge`, and read the check status once.

