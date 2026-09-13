# Per-artwork Terms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Artists can set a revenue share and an optional monthly paid loan fee on each work; the Galleries card shows both, and the three placement forms start from the selected works' terms.

**Architecture:** Two nullable columns on `artist_works` (migration 148), resolved in one pure module, `src/lib/work-terms.ts`, which every consumer reads: the gallery builder, a new `WorkTermsLine` card component, the work editor, and the three placement forms. `GET /api/artist-works` gains the artist's default terms so both form consumers get them in one round trip. The Stripe webhook and every money path are untouched.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, zod, Supabase Postgres, Vitest with Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md`

## Global Constraints

- All commands run from `website/`, with `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem` exported.
- Public copy: British English, no em dashes, no en dashes, no `&mdash;` or `&ndash;` (AGENTS.md).
- A derived value is computed in one exported function (AGENTS.md): work terms only ever come from `src/lib/work-terms.ts`.
- `PAID_LOAN_MIN_GBP` (`src/lib/pricing.ts`, currently 15) is the only definition of the fee floor; the migration's CHECK is tested against it.
- Migration 148 is safe against the old and the new code and is applied to production before the branch deploys.
- The Stripe webhook, checkout and every order money path are not modified.
- `npm run check` exits 0 before every commit. Push only with the owner's confirmation.

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/146_pre_test_data_cleanup_snapshot.sql` | Create: repo parity, verbatim from production |
| `supabase/migrations/147_test_data_cleanup.sql` | Create: repo parity, verbatim from production |
| `supabase/migrations/148_artist_work_terms.sql` | Create: the two columns and their CHECKs |
| `tests/integration/new-table-lockdown.test.ts` | Modify: scope the table scan to `public` |
| `tests/integration/artist-work-terms-migration.test.ts` | Create: 148's shape and its floor against `PAID_LOAN_MIN_GBP` |
| `tests/integration/schema-columns.json` | Modify: `artist_works` gains the two columns once 148 is applied |
| `src/lib/work-terms.ts` (+ test) | Create: resolve, row read, starting terms, editor parse, fee formatting |
| `src/data/artists.ts` | Modify: `ArtistWork` gains the two fields |
| `src/lib/db/artist-profiles-transform.ts` (+ test) | Modify: `DbArtistWork` and the works map |
| `src/data/galleries.ts` (+ test) | Modify: `GalleryWork` and `artistsToGalleryWorks` read the resolver |
| `src/lib/validations.ts` (+ test) | Modify: `artistWorkInputSchema` |
| `src/app/api/artist-works/route.ts` (+ test) | Modify: POST writes only named terms; GET returns default terms |
| `src/lib/db/artist-works.ts` | Modify: new columns join the fallback ladder |
| `src/lib/db/writable-fields.ts` | Modify: allowlist |
| `src/components/WorkTermsLine.tsx` (+ test) | Create: the orange card line |
| `src/app/(pages)/browse/page.tsx` | Modify: use `WorkTermsLine` |
| `src/components/portfolio/WorksEditor.tsx` | Modify: two inputs, parse, save payload, rehydrate |
| `src/components/SpacesPlacementRequestForm.tsx` (+ test) | Modify: start from the works' terms, mixed note |
| `src/app/(pages)/spaces/page.tsx` | Modify: pass the artist's terms |
| `src/components/visualizer/WorksPanel.tsx` | Modify: `PanelWork` gains terms |
| `src/components/visualizer/WallVisualizer.tsx` | Modify: read terms, compute starting terms |
| `src/components/visualizer/ProposalSendPanel.tsx` (+ test) | Modify: accept starting terms, mixed note |
| `src/app/(pages)/artist-portal/placements/page.tsx` | Modify: start from the works' terms |

---

### Task 1: Migrations and the guards that read them

**Files:**
- Create: `supabase/migrations/146_pre_test_data_cleanup_snapshot.sql`, `supabase/migrations/147_test_data_cleanup.sql`, `supabase/migrations/148_artist_work_terms.sql`
- Create: `tests/integration/artist-work-terms-migration.test.ts`
- Modify: `tests/integration/new-table-lockdown.test.ts`, `tests/integration/schema-columns.json`

**Interfaces:**
- Produces: columns `artist_works.revenue_share_percent integer null` and `artist_works.paid_loan_monthly_gbp numeric null` in production.

- [ ] **Step 1: Write the failing migration test**

`tests/integration/artist-work-terms-migration.test.ts`:

```ts
// Migration 148 carries the ranges in the database because row security lets a
// signed-in artist write their own artist_works rows directly, skipping zod.
// The fee floor is duplicated into SQL, so this holds the two in step.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PAID_LOAN_MIN_GBP } from "../../src/lib/pricing";

const SQL = readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/148_artist_work_terms.sql"),
  "utf8",
);

describe("148_artist_work_terms.sql", () => {
  it("adds both columns, nullable", () => {
    expect(SQL).toMatch(/add column if not exists revenue_share_percent integer\s*,/i);
    expect(SQL).toMatch(/add column if not exists paid_loan_monthly_gbp numeric\s*;/i);
    expect(SQL).not.toMatch(/(revenue_share_percent integer|paid_loan_monthly_gbp numeric)\s+not null/i);
  });

  it("holds the share to a whole number from 0 to 100", () => {
    expect(SQL).toMatch(/revenue_share_percent is null or revenue_share_percent between 0 and 100/i);
  });

  it("uses the same fee floor as the app, and the same £100,000 cap", () => {
    const floor = /paid_loan_monthly_gbp >= (\d+(?:\.\d+)?)/i.exec(SQL)?.[1];
    expect(Number(floor)).toBe(PAID_LOAN_MIN_GBP);
    expect(SQL).toMatch(/paid_loan_monthly_gbp <= 100000/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/integration/artist-work-terms-migration.test.ts`
Expected: FAIL with `ENOENT` on `148_artist_work_terms.sql`.

- [ ] **Step 3: Write migration 148**

`supabase/migrations/148_artist_work_terms.sql`:

```sql
-- 148_artist_work_terms.sql
--
-- Per-artwork revenue share and paid loan fee.
-- Spec: docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md
--
-- Two nullable columns on artist_works. Null means "use the artist's profile
-- default" for the share and "no listed fee" for the loan fee, so every existing
-- row keeps its current behaviour and nothing visible changes until an artist
-- sets a value.
--
-- The ranges live here as well as in zod. Row security lets a signed-in artist
-- update their own artist_works rows directly with the publishable key, which
-- never passes through the API's validation. The fee floor is PAID_LOAN_MIN_GBP
-- in src/lib/pricing.ts; tests/integration/artist-work-terms-migration.test.ts
-- fails if the two disagree.
--
-- Safe against both the old and the new code: the old code never names these
-- columns, and select("*") readers simply receive two more keys. Apply it before
-- the deploy. artist_works is granted at table level, so no grant change.

alter table public.artist_works
  add column if not exists revenue_share_percent integer,
  add column if not exists paid_loan_monthly_gbp numeric;

alter table public.artist_works
  drop constraint if exists artist_works_revenue_share_percent_range,
  add constraint artist_works_revenue_share_percent_range
    check (revenue_share_percent is null or revenue_share_percent between 0 and 100);

alter table public.artist_works
  drop constraint if exists artist_works_paid_loan_monthly_gbp_range,
  add constraint artist_works_paid_loan_monthly_gbp_range
    check (paid_loan_monthly_gbp is null or (paid_loan_monthly_gbp >= 15 and paid_loan_monthly_gbp <= 100000));

notify pgrst, 'reload schema';
```

- [ ] **Step 4: Run the migration test and watch it pass**

Run: `npx vitest run tests/integration/artist-work-terms-migration.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write 146 and 147 from exactly what production ran**

Fetch the statements the MCP recorded, and write each file verbatim:

```sql
select name, array_to_string(statements, E'\n') as sql
from supabase_migrations.schema_migrations
where name in ('146_pre_test_data_cleanup_snapshot', '147_test_data_cleanup')
order by version;
```

Save the first row's `sql` to `supabase/migrations/146_pre_test_data_cleanup_snapshot.sql` and the second to `supabase/migrations/147_test_data_cleanup.sql`. Both already open with their `-- NNN_name.sql` header.

- [ ] **Step 6: Run the migration scanners and watch the lockdown test fail on 146**

Run: `npx vitest run tests/integration/new-table-lockdown.test.ts tests/integration/migration-numbering.test.ts`
Expected: `new-table-lockdown` FAILS with `146_pre_test_data_cleanup_snapshot.sql creates "backup_" without revoking anon/authenticated` (eleven times). Numbering passes.

- [ ] **Step 7: Scope the lockdown scan to `public`**

In `tests/integration/new-table-lockdown.test.ts`, replace `tablesCreated`:

```ts
/**
 * Tables a migration creates in `public`, by name.
 *
 * A table in another schema is out of scope: the rule is about the grants
 * Supabase hands anon and authenticated on `public`, which PostgREST exposes.
 * 146's backup_20260910 snapshot is the case that made this explicit; it
 * revokes the whole schema instead. Names may contain digits.
 */
function tablesCreated(sql: string): string[] {
  return [
    ...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:([a-z_][a-z0-9_]*)\.)?([a-z_][a-z0-9_]*)/gi),
  ]
    .filter((m) => !m[1] || m[1].toLowerCase() === "public")
    .map((m) => m[2].toLowerCase());
}
```

And add inside `describe("a new table locks itself down", ...)`:

```ts
  it("counts tables in public, with or without the prefix, and ignores other schemas", () => {
    expect(tablesCreated("create table public.foo_2 (id int);")).toEqual(["foo_2"]);
    expect(tablesCreated("create table if not exists bar (id int);")).toEqual(["bar"]);
    expect(tablesCreated("create table backup_20260910.orders as select * from public.orders;")).toEqual([]);
  });
```

- [ ] **Step 8: Run the scanners and watch them pass**

Run: `npx vitest run tests/integration/new-table-lockdown.test.ts tests/integration/migration-numbering.test.ts tests/integration/storage-hardening.test.ts tests/integration/migration-index-drops.test.ts src/lib/curation-tiers.test.ts`
Expected: PASS.

- [ ] **Step 9: Apply 148 to production and verify it**

Apply with the Supabase MCP `apply_migration`, name `148_artist_work_terms`, body identical to the file. Then:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'artist_works'
  and column_name in ('revenue_share_percent', 'paid_loan_monthly_gbp');

select conname from pg_constraint
where conrelid = 'public.artist_works'::regclass and conname like 'artist_works_%_range';
```

Expected: `revenue_share_percent integer YES`, `paid_loan_monthly_gbp numeric YES`, and both constraint names.

- [ ] **Step 10: Bring the schema snapshot in step with production**

```bash
python3 - <<'PY'
import json
p = "tests/integration/schema-columns.json"
d = json.load(open(p))
for col in ("revenue_share_percent", "paid_loan_monthly_gbp"):
    if col not in d["artist_works"]:
        d["artist_works"].append(col)
json.dump(d, open(p, "w"), indent=2)
open(p, "a").write("\n")
PY
git diff --stat tests/integration/schema-columns.json
```

Expected: one file changed, two insertions.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/146_pre_test_data_cleanup_snapshot.sql supabase/migrations/147_test_data_cleanup.sql supabase/migrations/148_artist_work_terms.sql tests/integration/artist-work-terms-migration.test.ts tests/integration/new-table-lockdown.test.ts tests/integration/schema-columns.json
git commit -m "feat(db): per-work revenue share and paid loan fee columns (148), with 146 and 147 committed for parity"
```

---

### Task 2: The work-terms module

**Files:**
- Create: `src/lib/work-terms.ts`, `src/lib/work-terms.test.ts`

**Interfaces:**
- Produces:
  - `interface WorkTermsInput { revenueShareOverride?: number | null; paidLoanMonthlyGbp?: number | null }`
  - `interface ArtistTermsInput { revenueSharePercent?: number | null }`
  - `interface ArtistTermsPayload { revenueSharePercent: number | null; openToRevenueShare: boolean; openToFreeLoan: boolean }`
  - `resolveWorkTerms(work: WorkTermsInput, artist: ArtistTermsInput): { revenueSharePercent: number; usesDefaultShare: boolean; paidLoanMonthlyGbp: number | null }`
  - `workTermsFromRow(row: Record<string, unknown>): { revenueShareOverride: number | null; paidLoanMonthlyGbp: number | null }`
  - `interface InitialPlacementTerms { revenueSharePercent: number | null; monthlyFeeGbp: number | null; mixed: boolean }`
  - `initialPlacementTerms(works: WorkTermsInput[], artist: ArtistTermsInput): InitialPlacementTerms`
  - `MIXED_TERMS_NOTE: string`
  - `parseWorkTermsForm(shareRaw: string, feeRaw: string): { ok: true; revenueShareOverride: number | null; paidLoanMonthlyGbp: number | null } | { ok: false; error: string }`
  - `formatMonthlyFee(fee: number): string` returning `"£40/month"`, and `speakMonthlyFee(fee: number): string` returning `"£40 a month"`

- [ ] **Step 1: Write the failing tests**

`src/lib/work-terms.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PAID_LOAN_MIN_GBP } from "./pricing";
import {
  MIXED_TERMS_NOTE,
  formatMonthlyFee,
  initialPlacementTerms,
  parseWorkTermsForm,
  resolveWorkTerms,
  speakMonthlyFee,
  workTermsFromRow,
} from "./work-terms";

describe("resolveWorkTerms", () => {
  it("uses the work's own share when it has one", () => {
    expect(resolveWorkTerms({ revenueShareOverride: 30 }, { revenueSharePercent: 25 })).toEqual({
      revenueSharePercent: 30,
      usesDefaultShare: false,
      paidLoanMonthlyGbp: null,
    });
  });

  it("treats an explicit 0 as the work's own share, not as blank", () => {
    const terms = resolveWorkTerms({ revenueShareOverride: 0 }, { revenueSharePercent: 25 });
    expect(terms.revenueSharePercent).toBe(0);
    expect(terms.usesDefaultShare).toBe(false);
  });

  it("falls back to the artist's default when the work has none", () => {
    const terms = resolveWorkTerms({ revenueShareOverride: null }, { revenueSharePercent: 25 });
    expect(terms.revenueSharePercent).toBe(25);
    expect(terms.usesDefaultShare).toBe(true);
  });

  it("resolves to 0 when neither the work nor the artist has a share", () => {
    expect(resolveWorkTerms({}, {}).revenueSharePercent).toBe(0);
  });

  it("passes a listed fee through and leaves an unlisted one null", () => {
    expect(resolveWorkTerms({ paidLoanMonthlyGbp: 42.5 }, {}).paidLoanMonthlyGbp).toBe(42.5);
    expect(resolveWorkTerms({}, {}).paidLoanMonthlyGbp).toBeNull();
  });
});

describe("workTermsFromRow", () => {
  it("reads both columns off a raw row, tolerating a numeric string", () => {
    expect(workTermsFromRow({ revenue_share_percent: 30, paid_loan_monthly_gbp: "42.50" })).toEqual({
      revenueShareOverride: 30,
      paidLoanMonthlyGbp: 42.5,
    });
  });

  it("reads missing or null columns as no value", () => {
    expect(workTermsFromRow({})).toEqual({ revenueShareOverride: null, paidLoanMonthlyGbp: null });
    expect(workTermsFromRow({ revenue_share_percent: null, paid_loan_monthly_gbp: null })).toEqual({
      revenueShareOverride: null,
      paidLoanMonthlyGbp: null,
    });
  });
});

describe("initialPlacementTerms", () => {
  const artist = { revenueSharePercent: 25 };

  it("keeps the form's own defaults when nothing is selected", () => {
    expect(initialPlacementTerms([], artist)).toEqual({ revenueSharePercent: null, monthlyFeeGbp: null, mixed: false });
  });

  it("starts from a single work's terms", () => {
    expect(initialPlacementTerms([{ revenueShareOverride: 30, paidLoanMonthlyGbp: 40 }], artist)).toEqual({
      revenueSharePercent: 30,
      monthlyFeeGbp: 40,
      mixed: false,
    });
  });

  it("uses the artist's default for a work without its own share", () => {
    expect(initialPlacementTerms([{}], artist).revenueSharePercent).toBe(25);
  });

  it("keeps the form's own starting share when there is no share anywhere", () => {
    expect(initialPlacementTerms([{}], {}).revenueSharePercent).toBeNull();
  });

  it("totals the listed fees and does not flag works that agree on the share", () => {
    expect(initialPlacementTerms([{ paidLoanMonthlyGbp: 40 }, { paidLoanMonthlyGbp: 60 }], artist)).toEqual({
      revenueSharePercent: 25,
      monthlyFeeGbp: 100,
      mixed: false,
    });
  });

  it("takes the first work's share and flags works whose shares differ", () => {
    const terms = initialPlacementTerms([{ revenueShareOverride: 30 }, {}], artist);
    expect(terms.revenueSharePercent).toBe(30);
    expect(terms.mixed).toBe(true);
  });

  it("flags a selection where only some works list a fee", () => {
    const terms = initialPlacementTerms([{ paidLoanMonthlyGbp: 40 }, {}], artist);
    expect(terms.monthlyFeeGbp).toBe(40);
    expect(terms.mixed).toBe(true);
  });

  it("rounds the total to pence", () => {
    expect(initialPlacementTerms([{ paidLoanMonthlyGbp: 15.1 }, { paidLoanMonthlyGbp: 15.2 }], artist).monthlyFeeGbp).toBe(30.3);
  });

  it("words the note without dashes", () => {
    expect(MIXED_TERMS_NOTE).not.toMatch(/[–—]/);
  });
});

describe("parseWorkTermsForm", () => {
  it("reads blanks as no value", () => {
    expect(parseWorkTermsForm("", " ")).toEqual({ ok: true, revenueShareOverride: null, paidLoanMonthlyGbp: null });
  });

  it("accepts a whole-number share and a fee, rounding the fee to pence", () => {
    expect(parseWorkTermsForm("30", "42.499")).toEqual({ ok: true, revenueShareOverride: 30, paidLoanMonthlyGbp: 42.5 });
  });

  it("refuses a share that is fractional or out of range", () => {
    for (const raw of ["12.5", "-1", "101", "abc"]) {
      expect(parseWorkTermsForm(raw, "").ok).toBe(false);
    }
  });

  it("refuses a fee under the paid loan floor or over the cap", () => {
    expect(parseWorkTermsForm("", String(PAID_LOAN_MIN_GBP - 1)).ok).toBe(false);
    expect(parseWorkTermsForm("", "100001").ok).toBe(false);
    expect(parseWorkTermsForm("", String(PAID_LOAN_MIN_GBP)).ok).toBe(true);
  });
});

describe("fee wording", () => {
  it("drops pence on whole pounds and keeps two decimals otherwise", () => {
    expect(formatMonthlyFee(40)).toBe("£40/month");
    expect(formatMonthlyFee(42.5)).toBe("£42.50/month");
    expect(speakMonthlyFee(40)).toBe("£40 a month");
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/lib/work-terms.test.ts`
Expected: FAIL, `Failed to resolve import "./work-terms"`.

- [ ] **Step 3: Write the module**

`src/lib/work-terms.ts`:

```ts
/**
 * A work's own terms: the revenue share it offers a venue, and the monthly fee
 * to take it on paid loan.
 *
 * Spec: docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md.
 *
 * Both are optional per work. A work with no share of its own uses the artist's
 * profile default. A work with no listed fee shows no price and is still offered
 * for paid loan exactly as before.
 *
 * AGENTS.md: a derived value is computed in one exported function. Every
 * surface that shows or starts from a work's terms reads them through here.
 */

import { gbp } from "@/lib/curation-tiers";
import { PAID_LOAN_MIN_GBP } from "@/lib/pricing";

export interface WorkTermsInput {
  /** The work's own share, or null / undefined when it uses the default. */
  revenueShareOverride?: number | null;
  /** The work's listed monthly paid loan fee in pounds, or null / undefined for none. */
  paidLoanMonthlyGbp?: number | null;
}

export interface ArtistTermsInput {
  revenueSharePercent?: number | null;
}

/** What GET /api/artist-works returns beside the works. */
export interface ArtistTermsPayload {
  revenueSharePercent: number | null;
  openToRevenueShare: boolean;
  openToFreeLoan: boolean;
}

export interface ResolvedWorkTerms {
  revenueSharePercent: number;
  usesDefaultShare: boolean;
  paidLoanMonthlyGbp: number | null;
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function resolveWorkTerms(work: WorkTermsInput, artist: ArtistTermsInput): ResolvedWorkTerms {
  const override = finiteOrNull(work.revenueShareOverride);
  return {
    revenueSharePercent: override ?? finiteOrNull(artist.revenueSharePercent) ?? 0,
    usesDefaultShare: override === null,
    paidLoanMonthlyGbp: finiteOrNull(work.paidLoanMonthlyGbp),
  };
}

/**
 * The two columns off a raw artist_works row, as GET /api/artist-works returns
 * it. PostgREST sends `numeric` as a JSON number; a string is tolerated so a
 * precision change upstream cannot silently read a fee as absent.
 */
export function workTermsFromRow(row: Record<string, unknown>): {
  revenueShareOverride: number | null;
  paidLoanMonthlyGbp: number | null;
} {
  return {
    revenueShareOverride: finiteOrNull(row.revenue_share_percent),
    paidLoanMonthlyGbp: finiteOrNull(row.paid_loan_monthly_gbp),
  };
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
 * the first work's and the fee is the total of the listed fees.
 */
export function initialPlacementTerms(works: WorkTermsInput[], artist: ArtistTermsInput): InitialPlacementTerms {
  if (works.length === 0) return { revenueSharePercent: null, monthlyFeeGbp: null, mixed: false };

  const artistDefault = finiteOrNull(artist.revenueSharePercent);
  const shareOf = (w: WorkTermsInput) => finiteOrNull(w.revenueShareOverride) ?? artistDefault;

  const fees = works.map((w) => finiteOrNull(w.paidLoanMonthlyGbp)).filter((f): f is number => f !== null);
  const total = fees.length > 0 ? Math.round(fees.reduce((sum, f) => sum + f, 0) * 100) / 100 : null;

  const distinctShares = new Set(works.map(shareOf)).size;
  const someButNotAllFees = fees.length > 0 && fees.length < works.length;

  return {
    revenueSharePercent: shareOf(works[0]),
    monthlyFeeGbp: total,
    mixed: works.length > 1 && (distinctShares > 1 || someButNotAllFees),
  };
}

export type WorkTermsFormResult =
  | { ok: true; revenueShareOverride: number | null; paidLoanMonthlyGbp: number | null }
  | { ok: false; error: string };

/** The work editor's two text inputs, checked against the same ranges as the database. */
export function parseWorkTermsForm(shareRaw: string, feeRaw: string): WorkTermsFormResult {
  const share = shareRaw.trim();
  const fee = feeRaw.trim();

  const shareVal = share === "" ? null : Number(share);
  if (shareVal !== null && (!Number.isInteger(shareVal) || shareVal < 0 || shareVal > 100)) {
    return { ok: false, error: "Revenue share must be a whole number from 0 to 100" };
  }

  const feeVal = fee === "" ? null : Number(fee);
  if (feeVal !== null && (!Number.isFinite(feeVal) || feeVal < PAID_LOAN_MIN_GBP || feeVal > 100_000)) {
    return { ok: false, error: `Monthly loan fees run from £${PAID_LOAN_MIN_GBP} to £100,000` };
  }

  return {
    ok: true,
    revenueShareOverride: shareVal,
    paidLoanMonthlyGbp: feeVal === null ? null : Math.round(feeVal * 100) / 100,
  };
}

/** "£40/month", or "£42.50/month": whole pounds drop the pence. */
export function formatMonthlyFee(fee: number): string {
  return `${gbp(fee)}/month`;
}

/** The same fee as a screen reader should say it. */
export function speakMonthlyFee(fee: number): string {
  return `${gbp(fee)} a month`;
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npx vitest run src/lib/work-terms.test.ts`
Expected: PASS, 21 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/work-terms.ts src/lib/work-terms.test.ts
git commit -m "feat(terms): one module for a work's revenue share and paid loan fee"
```

---

### Task 3: Carry the terms from the database to the gallery work

**Files:**
- Modify: `src/data/artists.ts`, `src/lib/db/artist-profiles-transform.ts`, `src/data/galleries.ts`
- Create: `src/lib/db/artist-profiles-transform.test.ts`, `src/data/galleries.test.ts`

**Interfaces:**
- Consumes: `workTermsFromRow`, `resolveWorkTerms` (Task 2).
- Produces: `ArtistWork.revenueShareOverride?: number | null`, `ArtistWork.paidLoanMonthlyGbp?: number | null`, `GalleryWork.paidLoanMonthlyGbp?: number | null`, and `GalleryWork.revenueSharePercent` as the resolved share.

- [ ] **Step 1: Write the failing tests**

`src/data/galleries.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Artist } from "./artists";
import { artistsToGalleryWorks } from "./galleries";

const work = {
  id: "w1",
  title: "Harbour Light",
  medium: "Oil",
  dimensions: "40 x 50 cm",
  priceBand: "£200",
  pricing: [],
  available: true,
  color: "#000000",
  image: "/w1.jpg",
};

function artistWith(works: Array<Record<string, unknown>>): Artist {
  return {
    slug: "a",
    name: "A",
    works,
    revenueSharePercent: 25,
    openToRevenueShare: true,
    openToFreeLoan: true,
    openToOutrightPurchase: true,
    themes: [],
    location: "",
    coordinates: null,
    primaryMedium: "",
    offersOriginals: true,
    offersPrints: false,
    offersFramed: false,
  } as unknown as Artist;
}

describe("artistsToGalleryWorks: per-work terms (migration 148)", () => {
  it("shows a work's own share instead of the artist's default", () => {
    const [g] = artistsToGalleryWorks([artistWith([{ ...work, revenueShareOverride: 30 }])]);
    expect(g.revenueSharePercent).toBe(30);
  });

  it("falls back to the artist's default for a work without one", () => {
    const [g] = artistsToGalleryWorks([artistWith([{ ...work }])]);
    expect(g.revenueSharePercent).toBe(25);
  });

  it("carries a listed fee to the card, and null when there is none", () => {
    const [withFee, withoutFee] = artistsToGalleryWorks([
      artistWith([{ ...work, paidLoanMonthlyGbp: 40 }, { ...work, id: "w2" }]),
    ]);
    expect(withFee.paidLoanMonthlyGbp).toBe(40);
    expect(withoutFee.paidLoanMonthlyGbp).toBeNull();
  });
});
```

`src/lib/db/artist-profiles-transform.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dbProfileToArtist, type DbArtistProfile, type DbArtistWork } from "./artist-profiles-transform";

const profile = {
  id: "ap_1",
  user_id: "u_1",
  slug: "a",
  name: "A",
  revenue_share_percent: 25,
  open_to_free_loan: true,
  open_to_revenue_share: true,
  open_to_outright_purchase: true,
} as unknown as DbArtistProfile;

const row = {
  id: "w1",
  artist_id: "ap_1",
  title: "Harbour Light",
  medium: "",
  dimensions: "",
  price_band: "",
  pricing: [],
  available: true,
  color: "",
  image: "/w1.jpg",
  orientation: "landscape",
  sort_order: 0,
} as DbArtistWork;

describe("dbProfileToArtist: per-work terms (migration 148)", () => {
  it("keeps a work's own terms separate from the artist's default", () => {
    const artist = dbProfileToArtist(profile, [{ ...row, revenue_share_percent: 30, paid_loan_monthly_gbp: 40 }]);
    expect(artist.works[0].revenueShareOverride).toBe(30);
    expect(artist.works[0].paidLoanMonthlyGbp).toBe(40);
    expect(artist.revenueSharePercent).toBe(25);
  });

  it("reads unset columns as null, which means the default applies", () => {
    const artist = dbProfileToArtist(profile, [row]);
    expect(artist.works[0].revenueShareOverride).toBeNull();
    expect(artist.works[0].paidLoanMonthlyGbp).toBeNull();
  });
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/data/galleries.test.ts src/lib/db/artist-profiles-transform.test.ts`
Expected: FAIL. Gallery: share `25` where `30` was expected, and `paidLoanMonthlyGbp` `undefined`. Transform: `revenueShareOverride` `undefined`.

- [ ] **Step 3: Add the fields to `ArtistWork`**

In `src/data/artists.ts`, after `current_placement_id?: string | null;` in `interface ArtistWork`:

```ts
  /** Migration 148. The work's own revenue share, or null to use the artist's
   *  default. Read it through resolveWorkTerms in src/lib/work-terms.ts. */
  revenueShareOverride?: number | null;
  /** Migration 148. Listed monthly paid loan fee in pounds, or null for none. */
  paidLoanMonthlyGbp?: number | null;
```

- [ ] **Step 4: Map the columns in the transform**

In `src/lib/db/artist-profiles-transform.ts`, add to `interface DbArtistWork` after `featured_until?: string | null;`:

```ts
  /** Migration 148: null means the artist's profile default applies. */
  revenue_share_percent?: number | null;
  /** Migration 148: listed monthly paid loan fee, null for none. */
  paid_loan_monthly_gbp?: number | null;
```

Add the import beside the file's other imports:

```ts
import { workTermsFromRow } from "@/lib/work-terms";
```

In `dbProfileToArtist`'s `works.map`, after `current_placement_id: w.current_placement_id ?? null,`:

```ts
      // Migration 148. Raw override and fee; resolveWorkTerms applies the default.
      ...workTermsFromRow(w as unknown as Record<string, unknown>),
```

- [ ] **Step 5: Resolve the terms in the gallery builder**

In `src/data/galleries.ts`, add the import:

```ts
import { resolveWorkTerms } from "@/lib/work-terms";
```

In `interface GalleryWork`, after `revenueSharePercent?: number;`:

```ts
  /** Listed monthly paid loan fee, null for none. Migration 148. */
  paidLoanMonthlyGbp?: number | null;
```

In `artistsToGalleryWorks`, change `artist.works.map((work) => ({` to:

```ts
    artist.works.map((work) => {
      // Spec 2026-09-13. This builder names every field and never spreads the
      // work, so a work field not named here never reaches the card.
      const terms = resolveWorkTerms(work, artist);
      return {
```

Replace `revenueSharePercent: artist.revenueSharePercent,` with:

```ts
      revenueSharePercent: terms.revenueSharePercent,
      paidLoanMonthlyGbp: terms.paidLoanMonthlyGbp,
```

And close the callback: replace the final

```ts
      createdAt: work.createdAt,
    }))
  );
```

with

```ts
      createdAt: work.createdAt,
      };
    })
  );
```

- [ ] **Step 6: Run and watch them pass**

Run: `npx vitest run src/data/galleries.test.ts src/lib/db/artist-profiles-transform.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/data/artists.ts src/data/galleries.ts src/data/galleries.test.ts src/lib/db/artist-profiles-transform.ts src/lib/db/artist-profiles-transform.test.ts
git commit -m "feat(terms): gallery works carry their own revenue share and paid loan fee"
```

---

### Task 4: The save path, and the default terms on GET

**Files:**
- Modify: `src/lib/validations.ts`, `src/app/api/artist-works/route.ts`, `src/lib/db/artist-works.ts`, `src/lib/db/writable-fields.ts`
- Test: `src/lib/validations.test.ts`, `src/app/api/artist-works/route.test.ts`

**Interfaces:**
- Consumes: `ArtistTermsPayload` (Task 2).
- Produces: `POST /api/artist-works` accepts `revenueShareOverride?: number | null` and `paidLoanMonthlyGbp?: number | null`; `GET /api/artist-works` returns `{ works, terms: ArtistTermsPayload | null }`.

- [ ] **Step 1: Write the failing schema tests**

Append to `src/lib/validations.test.ts`, adding `import { PAID_LOAN_MIN_GBP } from "./pricing";` to its imports:

```ts
describe("artistWorkInputSchema: per-work terms (migration 148)", () => {
  const work = { id: "w_1", title: "Harbour Light", image: "https://example.com/x.jpg" };

  it("accepts a whole-number share from 0 to 100, or null to clear it", () => {
    for (const value of [0, 30, 100, null]) {
      expect(artistWorkInputSchema.safeParse({ ...work, revenueShareOverride: value }).success).toBe(true);
    }
  });

  it("rejects a share outside 0 to 100, or with a fraction", () => {
    for (const value of [-1, 101, 12.5]) {
      expect(artistWorkInputSchema.safeParse({ ...work, revenueShareOverride: value }).success).toBe(false);
    }
  });

  it("holds a listed fee to the paid loan floor and the £100,000 cap", () => {
    expect(artistWorkInputSchema.safeParse({ ...work, paidLoanMonthlyGbp: PAID_LOAN_MIN_GBP }).success).toBe(true);
    expect(artistWorkInputSchema.safeParse({ ...work, paidLoanMonthlyGbp: 42.5 }).success).toBe(true);
    expect(artistWorkInputSchema.safeParse({ ...work, paidLoanMonthlyGbp: null }).success).toBe(true);
    expect(artistWorkInputSchema.safeParse({ ...work, paidLoanMonthlyGbp: PAID_LOAN_MIN_GBP - 1 }).success).toBe(false);
    expect(artistWorkInputSchema.safeParse({ ...work, paidLoanMonthlyGbp: 100_001 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing route tests**

In `src/app/api/artist-works/route.test.ts`, change `import { POST } from "./route";` to `import { GET, POST } from "./route";` and append:

```ts
describe("POST /api/artist-works: per-work terms (migration 148)", () => {
  it("saves a work's own share and listed fee", async () => {
    const res = await POST(req({ ...baseBody, revenueShareOverride: 30, paidLoanMonthlyGbp: 40 }));
    expect(res.status).toBe(200);
    const row = upsertWorkMock.mock.calls[0][1];
    expect(row.revenue_share_percent).toBe(30);
    expect(row.paid_loan_monthly_gbp).toBe(40);
  });

  it("clears both with an explicit null", async () => {
    await POST(req({ ...baseBody, revenueShareOverride: null, paidLoanMonthlyGbp: null }));
    const row = upsertWorkMock.mock.calls[0][1];
    expect(row.revenue_share_percent).toBeNull();
    expect(row.paid_loan_monthly_gbp).toBeNull();
  });

  it("leaves both untouched when the request does not name them, as a reorder save does", async () => {
    await POST(req(baseBody));
    const row = upsertWorkMock.mock.calls[0][1];
    expect("revenue_share_percent" in row).toBe(false);
    expect("paid_loan_monthly_gbp" in row).toBe(false);
  });

  it("refuses a fee under the paid loan floor", async () => {
    const res = await POST(req({ ...baseBody, paidLoanMonthlyGbp: 5 }));
    expect(res.status).toBe(400);
    expect(upsertWorkMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/artist-works: the artist's default terms (migration 148)", () => {
  function getReq(): Request {
    return new Request("http://localhost/api/artist-works", { headers: { authorization: "Bearer valid" } });
  }

  it("returns the profile's share and arrangement flags beside the works", async () => {
    getProfileMock.mockResolvedValue({
      profile: { id: "ap_1", revenue_share_percent: 25, open_to_revenue_share: true, open_to_free_loan: false },
    });
    getWorksMock.mockResolvedValue([{ id: "w_1" }]);
    const body = await (await GET(getReq())).json();
    expect(body.works).toEqual([{ id: "w_1" }]);
    expect(body.terms).toEqual({ revenueSharePercent: 25, openToRevenueShare: true, openToFreeLoan: false });
  });

  it("returns null terms when there is no artist profile", async () => {
    getProfileMock.mockResolvedValue(null);
    expect(await (await GET(getReq())).json()).toEqual({ works: [], terms: null });
  });
});
```

- [ ] **Step 3: Run and watch them fail**

Run: `npx vitest run src/lib/validations.test.ts src/app/api/artist-works/route.test.ts`
Expected: FAIL. Schema: out-of-range values parse because zod strips unknown keys. Route: `revenue_share_percent` `undefined`, and GET returns no `terms`.

- [ ] **Step 4: Add the fields to the schema**

In `src/lib/validations.ts`, inside `artistWorkInputSchema`, after `availableInStore: z.boolean().optional(),`:

```ts
  // Migration 148. null clears the work's own value. An omitted key leaves the
  // stored value alone: the portfolio re-saves every work on a reorder without
  // these keys. Same ranges as the database CHECKs.
  revenueShareOverride: z.number().int().min(0).max(100).nullable().optional(),
  paidLoanMonthlyGbp: z
    .number()
    .finite()
    .min(PAID_LOAN_MIN_GBP, { message: `Monthly loan fees start at £${PAID_LOAN_MIN_GBP}.` })
    .max(100_000)
    .nullable()
    .optional(),
```

- [ ] **Step 5: Write only the terms the request names, and return the defaults on GET**

In `src/app/api/artist-works/route.ts`, extend the POST destructure to:

```ts
    const {
      id, title, medium, dimensions, priceBand, pricing, available, color, image,
      orientation, sortOrder, shippingPrice, inStorePrice, availableInStore, quantityAvailable, frameOptions,
      description, images, revenueShareOverride, paidLoanMonthlyGbp,
    } = parsed.data;
```

In the `upsertWork(...)` payload, after `quantity_available: quantityAvailable ?? null,`:

```ts
      // Migration 148. Written only when the request names them. The portfolio
      // re-saves every work on a reorder without these keys, and writing null
      // there would silently wipe an artist's per-work terms. An explicit null
      // still clears a value.
      ...(revenueShareOverride !== undefined ? { revenue_share_percent: revenueShareOverride } : {}),
      ...(paidLoanMonthlyGbp !== undefined ? { paid_loan_monthly_gbp: paidLoanMonthlyGbp } : {}),
```

Replace the body of `GET` after the auth check with:

```ts
  const result = await getArtistProfileByUserId(auth.user!.id);
  if (!result) {
    return NextResponse.json({ works: [], terms: null });
  }

  const works = await getWorksByArtistProfileId(result.profile.id);
  // Migration 148. The Spaces request form and the wall visualiser both start
  // from a work's own terms and fall back to these, so they arrive together.
  return NextResponse.json({
    works,
    terms: {
      revenueSharePercent: result.profile.revenue_share_percent ?? null,
      openToRevenueShare: result.profile.open_to_revenue_share ?? true,
      openToFreeLoan: result.profile.open_to_free_loan ?? true,
    },
  });
```

- [ ] **Step 6: Let a pre-migration write degrade instead of failing**

In `src/lib/db/artist-works.ts`, extend `extendedColumns`:

```ts
  const extendedColumns = [
    "description",
    "images",
    "frame_options",
    "shipping_price",
    "in_store_price",
    "quantity_available",
    // Migration 148. Listed here so a write that reaches a database without
    // the columns drops them and saves the rest, instead of failing the core
    // write that would otherwise still carry them.
    "revenue_share_percent",
    "paid_loan_monthly_gbp",
  ] as const;
```

In `src/lib/db/writable-fields.ts`, inside `ARTIST_WORK_WRITABLE`, after `"description",`:

```ts
  // Migration 148: per-work revenue share and listed paid loan fee.
  "revenue_share_percent",
  "paid_loan_monthly_gbp",
```

- [ ] **Step 7: Run and watch them pass**

Run: `npx vitest run src/lib/validations.test.ts src/app/api/artist-works/route.test.ts src/lib/db/writable-fields.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/validations.ts src/lib/validations.test.ts src/app/api/artist-works/route.ts src/app/api/artist-works/route.test.ts src/lib/db/artist-works.ts src/lib/db/writable-fields.ts
git commit -m "feat(terms): save per-work terms without wiping them on reorder, and return the default terms"
```

---

### Task 5: The card line

**Files:**
- Create: `src/components/WorkTermsLine.tsx`, `src/components/WorkTermsLine.test.tsx`
- Modify: `src/app/(pages)/browse/page.tsx`

**Interfaces:**
- Consumes: `formatMonthlyFee`, `speakMonthlyFee` (Task 2); `GalleryWork.paidLoanMonthlyGbp` (Task 3).
- Produces: `default function WorkTermsLine(props: { openToRevenueShare: boolean; revenueSharePercent?: number | null; openToFreeLoan: boolean; paidLoanMonthlyGbp?: number | null })`.

- [ ] **Step 1: Write the failing tests**

`src/components/WorkTermsLine.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import WorkTermsLine from "./WorkTermsLine";

afterEach(() => cleanup());

const open = { openToRevenueShare: true, openToFreeLoan: true };

describe("<WorkTermsLine />", () => {
  it("shows the share and the fee with a dot between them, and says it without the dot", () => {
    render(<WorkTermsLine {...open} revenueSharePercent={25} paidLoanMonthlyGbp={40} />);
    expect(screen.getByText("25% Revenue Share · £40/month Paid Loan")).toBeTruthy();
    expect(screen.getByText("25% Revenue Share, £40 a month Paid Loan")).toBeTruthy();
  });

  it("shows the share alone when no fee is listed", () => {
    render(<WorkTermsLine {...open} revenueSharePercent={25} paidLoanMonthlyGbp={null} />);
    expect(screen.getByText("25% Revenue Share")).toBeTruthy();
    expect(screen.queryByText(/Paid Loan/)).toBeNull();
  });

  it("shows the fee alone, with pence, when the artist is not open to revenue share", () => {
    render(<WorkTermsLine openToRevenueShare={false} openToFreeLoan revenueSharePercent={25} paidLoanMonthlyGbp={42.5} />);
    expect(screen.getByText("£42.50/month Paid Loan")).toBeTruthy();
    expect(screen.queryByText(/Revenue Share/)).toBeNull();
  });

  it("hides a fee when the artist is not open to paid loans", () => {
    render(<WorkTermsLine openToRevenueShare openToFreeLoan={false} revenueSharePercent={25} paidLoanMonthlyGbp={40} />);
    expect(screen.queryByText(/Paid Loan/)).toBeNull();
  });

  it("keeps a blank spacer row when there is nothing to show", () => {
    const { container } = render(<WorkTermsLine {...open} revenueSharePercent={0} paidLoanMonthlyGbp={null} />);
    const line = container.querySelector("p");
    expect(line?.getAttribute("aria-hidden")).toBe("true");
    expect(line?.textContent?.trim()).toBe("");
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/components/WorkTermsLine.test.tsx`
Expected: FAIL, `Failed to resolve import "./WorkTermsLine"`.

- [ ] **Step 3: Write the component**

`src/components/WorkTermsLine.tsx`:

```tsx
import { formatMonthlyFee, speakMonthlyFee } from "@/lib/work-terms";

/**
 * The orange terms line under a Galleries work card: the revenue share a venue
 * earns and, when the artist lists one, the monthly fee to take the work on paid
 * loan. Spec: docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md.
 *
 * A transparent spacer stands in when there is nothing to show, so cards in a
 * row keep the same height. Two terms can wrap on a narrow card, so the line
 * reserves two lines below `sm` and one from `sm` up.
 */
export interface WorkTermsLineProps {
  openToRevenueShare: boolean;
  revenueSharePercent?: number | null;
  openToFreeLoan: boolean;
  paidLoanMonthlyGbp?: number | null;
}

const LINE = "text-[11px] mt-1 leading-snug min-h-[2.75em] sm:min-h-[1.375em]";

export default function WorkTermsLine({
  openToRevenueShare,
  revenueSharePercent,
  openToFreeLoan,
  paidLoanMonthlyGbp,
}: WorkTermsLineProps) {
  const share =
    openToRevenueShare && revenueSharePercent != null && revenueSharePercent > 0 ? revenueSharePercent : null;
  const fee = openToFreeLoan && paidLoanMonthlyGbp != null && paidLoanMonthlyGbp > 0 ? paidLoanMonthlyGbp : null;

  if (share === null && fee === null) {
    return (
      <p className={LINE} aria-hidden="true">
        &nbsp;
      </p>
    );
  }

  const shareText = share !== null ? `${share}% Revenue Share` : null;
  const visible = [shareText, fee !== null ? `${formatMonthlyFee(fee)} Paid Loan` : null].filter(Boolean).join(" · ");
  const spoken = [shareText, fee !== null ? `${speakMonthlyFee(fee)} Paid Loan` : null].filter(Boolean).join(", ");

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

- [ ] **Step 4: Run and watch it pass**

Run: `npx vitest run src/components/WorkTermsLine.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Use it on the Galleries card**

In `src/app/(pages)/browse/page.tsx`, after `import { artistsToGalleryWorks } from "@/data/galleries";`:

```tsx
import WorkTermsLine from "@/components/WorkTermsLine";
```

Replace the block that starts `{/* Reserve a row for the revenue-share line on every` and ends with the `&nbsp;` placeholder's closing `)}` with:

```tsx
                            {/* Revenue share and listed paid loan fee (spec
                                2026-09-13). WorkTermsLine keeps a spacer when
                                there is neither, so rows still line up. */}
                            <WorkTermsLine
                              openToRevenueShare={work.openToRevenueShare}
                              revenueSharePercent={work.revenueSharePercent}
                              openToFreeLoan={work.openToFreeLoan}
                              paidLoanMonthlyGbp={work.paidLoanMonthlyGbp}
                            />
```

- [ ] **Step 6: Run the browse page tests**

Run: `npx vitest run "src/app/(pages)/browse/page.test.tsx" src/components/WorkTermsLine.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/WorkTermsLine.tsx src/components/WorkTermsLine.test.tsx "src/app/(pages)/browse/page.tsx"
git commit -m "feat(browse): show a work's revenue share and paid loan fee on its card"
```

---

### Task 6: The work editor

**Files:**
- Modify: `src/components/portfolio/WorksEditor.tsx`

**Interfaces:**
- Consumes: `parseWorkTermsForm` (Task 2); `ArtistWork.revenueShareOverride`, `ArtistWork.paidLoanMonthlyGbp` (Task 3); the POST contract (Task 4).

The editor's parsing is `parseWorkTermsForm`, tested in Task 2; the save contract is tested in Task 4. This task wires them, and the typecheck proves every `WorkFormState` literal carries the new fields.

- [ ] **Step 1: Add the form fields**

Add the imports beside the component's other imports:

```ts
import { PAID_LOAN_MIN_GBP } from "@/lib/pricing";
import { parseWorkTermsForm } from "@/lib/work-terms";
```

In `interface WorkFormState`, replace

```ts
  detectedRatio: number | null;
  quantityAvailable: string;
```

with

```ts
  detectedRatio: number | null;
  quantityAvailable: string;
  /** Migration 148. Blank means the artist's profile default applies. */
  revenueShareOverride: string;
  /** Migration 148. Blank means no listed paid loan fee. */
  paidLoanMonthlyGbp: string;
```

In `emptyWork`, replace `  quantityAvailable: "",` with:

```ts
  quantityAvailable: "",
  revenueShareOverride: "",
  paidLoanMonthlyGbp: "",
```

- [ ] **Step 2: Rehydrate them when editing and duplicating**

In `openEdit`'s `initial` object, and in `duplicateFrom`'s `openAdd({...})` seed, add after the `shippingPrice:` line:

```ts
      revenueShareOverride: w.revenueShareOverride != null ? String(w.revenueShareOverride) : "",
      paidLoanMonthlyGbp: w.paidLoanMonthlyGbp != null ? w.paidLoanMonthlyGbp.toFixed(2) : "",
```

- [ ] **Step 3: Typecheck and add the fields to any other literal it names**

Run: `npx tsc --noEmit`
Expected: exit 0. Where it reports `Property 'revenueShareOverride' is missing in type`, add the same two `""` fields to that `WorkFormState` literal and rerun until it exits 0.

- [ ] **Step 4: Parse and validate on save**

After `const lowestPrice = Math.min(...validSizes.map((s) => s.price));`:

```ts
    // Migration 148. Same ranges as the database CHECKs; a blank clears.
    const terms = parseWorkTermsForm(form.revenueShareOverride, form.paidLoanMonthlyGbp);
    if (!terms.ok) {
      setFormError(terms.error);
      return;
    }
```

In the `newWork` object, after `quantityAvailable: qtyFinite ? qtyVal : null,`:

```ts
      revenueShareOverride: terms.revenueShareOverride,
      paidLoanMonthlyGbp: terms.paidLoanMonthlyGbp,
```

- [ ] **Step 5: Send them with every save**

In the `mutate("/api/artist-works", ...)` body, after the `quantityAvailable:` line:

```ts
              // Migration 148. undefined drops out of JSON, so the route leaves
              // the stored value alone; null clears it.
              revenueShareOverride: work.revenueShareOverride,
              paidLoanMonthlyGbp: work.paidLoanMonthlyGbp,
```

- [ ] **Step 6: Add the inputs**

Immediately before `{/* Available toggle */}`:

```tsx
            {/* Placement terms for this work (migration 148). Blank uses the
                profile default, or lists no fee. Each input shows only when the
                artist is open to that arrangement. */}
            {((profile?.open_to_revenue_share ?? true) || (profile?.open_to_free_loan ?? true)) && (
              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-sm font-medium">Placement terms for this work</p>
                {(profile?.open_to_revenue_share ?? true) && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label htmlFor="work-revenue-share" className="text-sm sm:w-40 shrink-0">
                      Revenue share %
                    </label>
                    <input
                      id="work-revenue-share"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={form.revenueShareOverride}
                      onChange={(e) => setForm((p) => ({ ...p, revenueShareOverride: e.target.value }))}
                      placeholder={
                        profile?.revenue_share_percent != null
                          ? `${profile.revenue_share_percent}%, your default`
                          : "Your default"
                      }
                      className="w-44 bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent/60"
                    />
                  </div>
                )}
                {(profile?.open_to_free_loan ?? true) && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label htmlFor="work-paid-loan-fee" className="text-sm sm:w-40 shrink-0">
                      Paid loan, £ a month
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted">£</span>
                      <input
                        id="work-paid-loan-fee"
                        type="number"
                        min={PAID_LOAN_MIN_GBP}
                        step="0.01"
                        value={form.paidLoanMonthlyGbp}
                        onChange={(e) => setForm((p) => ({ ...p, paidLoanMonthlyGbp: e.target.value }))}
                        placeholder="No listed fee"
                        className="w-40 bg-background border border-border rounded-sm px-3 py-2 text-sm text-right focus:outline-none focus:border-accent/60"
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted">These don&rsquo;t change placements you&rsquo;ve already agreed.</p>
              </div>
            )}

```

- [ ] **Step 7: Typecheck and lint the file**

Run: `npx tsc --noEmit && npx eslint src/components/portfolio/WorksEditor.tsx`
Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/portfolio/WorksEditor.tsx
git commit -m "feat(portfolio): set a revenue share and paid loan fee on each work"
```

---

### Task 7: The Spaces request form

**Files:**
- Modify: `src/components/SpacesPlacementRequestForm.tsx`, `src/app/(pages)/spaces/page.tsx`
- Test: `src/components/SpacesPlacementRequestForm.test.tsx`

**Interfaces:**
- Consumes: `initialPlacementTerms`, `workTermsFromRow`, `MIXED_TERMS_NOTE`, `ArtistTermsPayload` (Task 2); `GET /api/artist-works` `terms` (Task 4).
- Produces: `SpacesPlacementRequestForm` prop `artistTerms?: ArtistTermsPayload | null`.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/SpacesPlacementRequestForm.test.tsx`:

```tsx
describe("SpacesPlacementRequestForm starts from the work's terms (spec 2026-09-13)", () => {
  const TERMS = { revenueSharePercent: 20, openToRevenueShare: true, openToFreeLoan: true };

  function renderWith(works: Array<Record<string, unknown>>, artistTerms: typeof TERMS | null) {
    vi.stubGlobal("fetch", mockFetch({}));
    return render(
      <SpacesPlacementRequestForm
        venue={VENUE}
        works={works as typeof WORKS}
        artistTerms={artistTerms}
        authToken="token-123"
        onCancel={() => {}}
        onSuccess={() => {}}
      />,
    );
  }

  function shareInput() {
    return screen.getByLabelText("Revenue share to venue") as HTMLInputElement;
  }

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the revenue share at the work's own share", () => {
    renderWith([{ ...WORKS[0], revenue_share_percent: 30 }], TERMS);
    expect(shareInput().value).toBe("30");
  });

  it("falls back to the artist's default for a work without one", () => {
    renderWith([{ ...WORKS[0] }], TERMS);
    expect(shareInput().value).toBe("20");
  });

  it("keeps the form's own 25% when there is no share anywhere", () => {
    renderWith([{ ...WORKS[0] }], null);
    expect(shareInput().value).toBe("25");
  });

  it("keeps what the artist types", () => {
    renderWith([{ ...WORKS[0], revenue_share_percent: 30 }], TERMS);
    fireEvent.change(shareInput(), { target: { value: "12" } });
    expect(shareInput().value).toBe("12");
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/components/SpacesPlacementRequestForm.test.tsx`
Expected: FAIL, `Unable to find a label with the text of: Revenue share to venue`.

- [ ] **Step 3: Accept the terms and derive the starting values**

In `src/components/SpacesPlacementRequestForm.tsx`, add beside the imports:

```ts
import {
  MIXED_TERMS_NOTE,
  initialPlacementTerms,
  workTermsFromRow,
  type ArtistTermsPayload,
} from "@/lib/work-terms";
```

Extend the local `interface ArtistWork`:

```ts
  /** Raw artist_works columns (migration 148), as GET /api/artist-works returns them. */
  revenue_share_percent?: number | string | null;
  paid_loan_monthly_gbp?: number | string | null;
```

Add to `interface Props`, and to the destructured props:

```ts
  /** The artist's default terms, from GET /api/artist-works. */
  artistTerms?: ArtistTermsPayload | null;
```

Replace

```ts
  const [revenueShare, setRevenueShare] = useState<number>(25);
  const [monthlyFee, setMonthlyFee] = useState<number>(25);
```

with

```ts
  // Spec 2026-09-13. Both start from the selected works' terms (derived below
  // selectedWorks) until the artist types their own; null means not typed yet.
  const [revenueShareInput, setRevenueShareInput] = useState<number | null>(null);
  const [monthlyFeeInput, setMonthlyFeeInput] = useState<number | null>(null);
```

After `const primaryWork = selectedWorks[0] || null;`:

```ts
  const suggestedTerms = useMemo(
    () =>
      initialPlacementTerms(
        selectedWorks.map((w) => workTermsFromRow(w as unknown as Record<string, unknown>)),
        { revenueSharePercent: artistTerms?.revenueSharePercent ?? null },
      ),
    [selectedWorks, artistTerms],
  );
  const revenueShare = revenueShareInput ?? suggestedTerms.revenueSharePercent ?? 25;
  const monthlyFee = monthlyFeeInput ?? suggestedTerms.monthlyFeeGbp ?? 25;
```

- [ ] **Step 4: Point the inputs at the new setters, label them, and add the note**

In the revenue share input, replace `setRevenueShare(` with `setRevenueShareInput(` and add `aria-label="Revenue share to venue"`. In the monthly fee input, replace `setMonthlyFee(` with `setMonthlyFeeInput(` and add `aria-label="Monthly fee from venue"`.

Immediately before `{/* Terms, depend on arrangement */}`:

```tsx
          {action === "placement" && suggestedTerms.mixed && (
            <p role="note" className="text-[11px] text-muted leading-relaxed">
              {MIXED_TERMS_NOTE}
            </p>
          )}
```

- [ ] **Step 5: Pass the terms from the Spaces page**

In `src/app/(pages)/spaces/page.tsx`, add `import type { ArtistTermsPayload } from "@/lib/work-terms";`, extend `interface ArtistWorkLite`:

```ts
  revenue_share_percent?: number | string | null;
  paid_loan_monthly_gbp?: number | string | null;
```

After `const [worksLoading, setWorksLoading] = useState(false);`:

```ts
  const [artistTerms, setArtistTerms] = useState<ArtistTermsPayload | null>(null);
```

In the works fetch, replace

```ts
        const data = (await res.json()) as { works?: ArtistWorkLite[] };
        if (!cancelled) setMyWorks(data.works || []);
```

with

```ts
        const data = (await res.json()) as { works?: ArtistWorkLite[]; terms?: ArtistTermsPayload | null };
        if (!cancelled) {
          setMyWorks(data.works || []);
          setArtistTerms(data.terms ?? null);
        }
```

And pass `artistTerms={artistTerms}` to `<SpacesPlacementRequestForm`.

- [ ] **Step 6: Run and watch them pass**

Run: `npx vitest run src/components/SpacesPlacementRequestForm.test.tsx && npx tsc --noEmit`
Expected: PASS, and tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/SpacesPlacementRequestForm.tsx src/components/SpacesPlacementRequestForm.test.tsx "src/app/(pages)/spaces/page.tsx"
git commit -m "feat(spaces): start a placement request from the works' own terms"
```

---

### Task 8: The visualiser proposal

**Files:**
- Modify: `src/components/visualizer/WorksPanel.tsx`, `src/components/visualizer/WallVisualizer.tsx`, `src/components/visualizer/ProposalSendPanel.tsx`
- Test: `src/components/visualizer/ProposalSendPanel.test.tsx`

**Interfaces:**
- Consumes: `initialPlacementTerms`, `workTermsFromRow`, `MIXED_TERMS_NOTE`, `InitialPlacementTerms`, `ArtistTermsPayload` (Task 2); GET `terms` (Task 4).
- Produces: `ProposalSendPanelProps.initialTerms?: InitialPlacementTerms`; `PanelWork.revenueShareOverride?`, `PanelWork.paidLoanMonthlyGbp?`.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/visualizer/ProposalSendPanel.test.tsx`, adding `import { MIXED_TERMS_NOTE } from "@/lib/work-terms";` to its imports:

```tsx
describe("<ProposalSendPanel /> starts from the wall's works (spec 2026-09-13)", () => {
  function open() {
    fireEvent.click(screen.getByRole("button", { name: "Send to The Copper Kettle" }));
  }

  it("opens at the works' share and fee instead of the defaults", () => {
    mount({ initialTerms: { revenueSharePercent: 30, monthlyFeeGbp: 100, mixed: false } });
    open();
    expect((screen.getByLabelText("Revenue share to venue") as HTMLInputElement).value).toBe("30");
    fireEvent.click(screen.getByRole("radio", { name: "Paid loan" }));
    expect((screen.getByLabelText("Monthly fee from venue") as HTMLInputElement).value).toBe("100");
  });

  it("keeps the defaults for anything the works do not set", () => {
    mount({ initialTerms: { revenueSharePercent: null, monthlyFeeGbp: null, mixed: false } });
    open();
    expect((screen.getByLabelText("Revenue share to venue") as HTMLInputElement).value).toBe("25");
  });

  it("says so when the works on the wall list different terms", () => {
    mount({ initialTerms: { revenueSharePercent: 30, monthlyFeeGbp: 40, mixed: true } });
    open();
    expect(screen.getByText(MIXED_TERMS_NOTE)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/components/visualizer/ProposalSendPanel.test.tsx`
Expected: FAIL. The share reads `25` where `30` was expected, and the note is absent.

- [ ] **Step 3: Accept starting terms in the panel**

In `ProposalSendPanel.tsx`, add:

```ts
import { MIXED_TERMS_NOTE, type InitialPlacementTerms } from "@/lib/work-terms";
```

Add to `ProposalSendPanelProps`:

```ts
  /** Where the terms start, from the works on the wall (spec 2026-09-13). */
  initialTerms?: InitialPlacementTerms;
```

Add `initialTerms,` to the destructured props, then replace

```ts
  const [revenueShare, setRevenueShare] = useState(DEFAULT_REVENUE_SHARE_PERCENT);
  const [monthlyFee, setMonthlyFee] = useState(DEFAULT_MONTHLY_FEE_GBP);
```

with

```ts
  // null means the artist has not typed yet, so the value follows the works.
  const [revenueShareInput, setRevenueShareInput] = useState<number | null>(null);
  const [monthlyFeeInput, setMonthlyFeeInput] = useState<number | null>(null);
  const revenueShare = revenueShareInput ?? initialTerms?.revenueSharePercent ?? DEFAULT_REVENUE_SHARE_PERCENT;
  const monthlyFee = monthlyFeeInput ?? initialTerms?.monthlyFeeGbp ?? DEFAULT_MONTHLY_FEE_GBP;
```

In the two inputs, replace `setRevenueShare(` with `setRevenueShareInput(` and `setMonthlyFee(` with `setMonthlyFeeInput(`.

Replace

```tsx
          </fieldset>

          {arrangement === "revenue_share" && (
```

with

```tsx
          </fieldset>

          {initialTerms?.mixed && (
            <p role="note" className="text-[11px] text-stone-500">
              {MIXED_TERMS_NOTE}
            </p>
          )}

          {arrangement === "revenue_share" && (
```

- [ ] **Step 4: Run and watch it pass**

Run: `npx vitest run src/components/visualizer/ProposalSendPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Give the visualiser the works' terms**

In `WorksPanel.tsx`, add to `interface PanelWork`:

```ts
  /** Migration 148: the work's own revenue share and listed paid loan fee. */
  revenueShareOverride?: number | null;
  paidLoanMonthlyGbp?: number | null;
```

In `WallVisualizer.tsx`, add:

```ts
import {
  initialPlacementTerms,
  workTermsFromRow,
  type ArtistTermsPayload,
} from "@/lib/work-terms";
```

After `const [allWorks, setAllWorks] = useState<PanelWork[]>([]);`:

```ts
  const [artistTerms, setArtistTerms] = useState<ArtistTermsPayload | null>(null);
```

In the `/api/artist-works` fetch, change the handler's parameter type to `data: { works?: Array<Record<string, unknown>>; terms?: ArtistTermsPayload | null }`, and after `setWorks(mapped);` add:

```ts
          setArtistTerms(data.terms ?? null);
```

In `normaliseWork`'s returned object, after `orientation,`:

```ts
    ...workTermsFromRow(raw),
```

Immediately before `const selectedItem = useMemo(`:

```ts
  // Spec 2026-09-13. Wall order, so the first work matches the proposal's
  // primary work in buildProposalPlacement.
  const proposalInitialTerms = useMemo(
    () =>
      initialPlacementTerms(
        items.map((i) => workById[i.work_id]).filter((w): w is PanelWork => !!w),
        { revenueSharePercent: artistTerms?.revenueSharePercent ?? null },
      ),
    [items, workById, artistTerms],
  );
```

In the `proposal={...}` object passed to `RenderPreview`, after `error: proposalError,`:

```ts
                initialTerms: proposalInitialTerms,
```

- [ ] **Step 6: Typecheck and run the visualiser tests**

Run: `npx tsc --noEmit && npx vitest run src/components/visualizer src/lib/placements/wall-proposal-client.test.ts`
Expected: tsc exits 0, tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/visualizer/WorksPanel.tsx src/components/visualizer/WallVisualizer.tsx src/components/visualizer/ProposalSendPanel.tsx src/components/visualizer/ProposalSendPanel.test.tsx
git commit -m "feat(visualiser): start a wall proposal from the works' own terms"
```

---

### Task 9: The artist portal placement form

**Files:**
- Modify: `src/app/(pages)/artist-portal/placements/page.tsx`, `docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md`

**Interfaces:**
- Consumes: `initialPlacementTerms`, `MIXED_TERMS_NOTE` (Task 2); `ArtistWork` terms (Task 3).

This form has one extra wrinkle the spec did not spell out: a fee above 0 is what switches the arrangement to paid loan. Prefilling a fee on selection would silently change the arrangement, so the fee starts from the works' total only when the artist ticks Paid loan. The rules themselves are tested in Task 2.

- [ ] **Step 1: Derive the starting share**

Replace

```ts
  const [revenuePercent, setRevenuePercent] = useState<number | "">(10);
```

with

```ts
  // Spec 2026-09-13. One field is both the revenue share and, on a paid loan,
  // the QR share. It starts from the selected works' terms until the artist
  // types their own; null means not typed yet.
  const [revenuePercentInput, setRevenuePercentInput] = useState<number | "" | null>(null);
```

After `const [selectedWorks, setSelectedWorks] = useState<Set<number>>(new Set());`:

```ts
  const suggestedTerms = useMemo(
    () =>
      initialPlacementTerms(
        Array.from(selectedWorks)
          .map((i) => artist?.works[i])
          .filter((w): w is NonNullable<typeof w> => !!w),
        { revenueSharePercent: artist?.revenueSharePercent ?? null },
      ),
    [selectedWorks, artist],
  );
  const revenuePercent: number | "" = revenuePercentInput ?? suggestedTerms.revenueSharePercent ?? 10;
```

Add `import { MIXED_TERMS_NOTE, initialPlacementTerms } from "@/lib/work-terms";`, and add `useMemo` to the `react` import if it is not there.

- [ ] **Step 2: Repoint the setters**

Replace each `setRevenuePercent(` with `setRevenuePercentInput(`, and change the post-submit reset from `setRevenuePercentInput(0);` to `setRevenuePercentInput(null);` so the next form starts from the works again.

- [ ] **Step 3: Start the fee from the works when Paid loan is ticked**

Replace

```tsx
                    onChange={(e) => setMonthlyFee(e.target.checked ? 50 : "")}
```

with

```tsx
                    // Spec 2026-09-13. Ticking starts the fee at the selected
                    // works' total; with none listed it keeps the old £50.
                    onChange={(e) => setMonthlyFee(e.target.checked ? (suggestedTerms.monthlyFeeGbp ?? 50) : "")}
```

- [ ] **Step 4: Add the mixed-terms note**

Immediately before `{/* Revenue share, only meaningful when the arrangement is`:

```tsx
            {suggestedTerms.mixed && (
              <p role="note" className="text-xs text-muted">
                {MIXED_TERMS_NOTE}
              </p>
            )}
```

- [ ] **Step 5: Record the refinement in the spec**

In the spec's "Placement forms" section, replace the "Monthly fee" bullet with:

```md
- **Monthly fee** starts at the total of the selected works' listed fees, when
  at least one has a fee. Otherwise the form keeps its current starting value.
  In the artist portal form a fee above 0 is what makes the placement a paid
  loan, so there the total is applied when the artist ticks Paid loan rather
  than on selection.
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(pages)/artist-portal/placements/page.tsx"`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(pages)/artist-portal/placements/page.tsx" ../docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md
git commit -m "feat(portal): start a placement from the works' own terms"
```

---

### Task 10: Full gate, and the card checked by eye

- [ ] **Step 1: Run the whole gate**

Run: `npm run check`
Expected: exit 0, every test file passing, 0 lint errors.

- [ ] **Step 2: Push and open the pull request, with the owner's confirmation**

```bash
gh auth switch --user fcoles2598
git push -u origin claude/per-artwork-terms
gh pr create --base main --head claude/per-artwork-terms --title "Per-artwork revenue share and paid loan fee" --body-file /tmp/per-artwork-terms-pr.md
gh pr merge --auto --squash
```

- [ ] **Step 3: Check the card on the Vercel preview**

Open the preview URL's `/browse` in the Browser pane at 375, 768 and 1280 px wide. In production data no work has a fee yet, so first set one on a test work through the editor on the preview. Check: the line reads `25% Revenue Share · £40/month Paid Loan`; it wraps rather than cutting off at 375 px; cards in the same row keep equal heights at all three widths.
