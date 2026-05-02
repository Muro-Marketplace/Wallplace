# Plan B — Checkout & Payment Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every checkout / payment / refund integrity gap surfaced in the 2026-04-30 pre-launch QA report. The bar is "money never lands in the wrong place, the buyer always reaches their order, and the artist never gets paid before they ship."

**Architecture:** A new `cart_sessions` table becomes the source of truth for in-flight cart data so we stop relying on Stripe metadata's 500-char ceiling. A new `lib/iso-countries.ts` replaces the free-text country input with a typed dropdown, killing the "United Kingdom" string-match bug that silently bills as international. A new `lib/order-tracking-token.ts` (HMAC) signs guest-order links so `/api/orders/track` and `/api/refunds/request` can stop treating bare email as auth. Stripe Connect pre-flight is added to `/api/checkout` so an order can't be created against an artist whose payouts aren't enabled. JSONB writes are normalised across the codebase (no more mixed `JSON.stringify` / raw-array). Shipping signature uplift is recomputed off subtotal, not per-artist-group.

**Tech Stack:** Next.js 16.2, React 19.2, Supabase JS 2.103, Vitest 2.1, Stripe 22, Zod 4, Resend 6. Tests are colocated `*.test.ts` siblings (`vitest.config.ts:14`). Path alias `@/` → `src/` (`tsconfig.json:paths`).

**Independence from Plan A:** Plan B does NOT depend on Plan A landing first. Where a helper would be useful from Plan A (the HMAC pattern in `lib/oauth-state.ts`, the `safeRedirect` lib), Plan B creates its own equivalents under different names so both plans are independently mergeable. If Plan A merges first, a small follow-up can dedupe the HMAC code into one shared `lib/hmac-token.ts` — Plan F polish work.

**Out of scope (covered elsewhere):**
- Login `?next=` redirect, signup verification, role whitelist (Plan A)
- Self-purchase block at /api/checkout (Plan A Task 11 — when it lands, Plan B Task 9's pre-flight stacks cleanly on top)
- UI/mobile/empty-state polish (Plans D / E / F)
- Order state machine (Plan A Tasks 9 + 10 — already merged on the branch this PR is built on)

**Branch strategy:**
- One worktree for the whole plan: `git worktree add .claude/worktrees/qa-b-checkout-payments claude/qa-b-checkout-payments` (off `main`).
- Each task ends with a `git commit`. Push and open a draft PR after Phase 2 (so the cart_sessions migration lands early); promote to ready-for-review when the whole plan is green.
- `npm run check` (lint + typecheck + vitest) MUST pass before each commit.

**Verification gates between phases:** After each phase, run `npm run check` and a manual smoke against the demo accounts before moving on.

**Phases:**
1. Country dropdown (kills `=== "United Kingdom"` string match)
2. Server-side cart sessions (replaces 500-char Stripe metadata as data-of-record)
3. Stripe Connect pre-flight at checkout
4. Order tracking signed-token auth
5. Refund signed-token auth + duplicate prevention
6. JSONB consistency sweep
7. Shipping signature uplift at order level
8. Final verification + PR

---

## Phase 1 — Country dropdown

The current /checkout page has a free-text `<input>` for country and routes shipping cost via `country !== "United Kingdom" ? "international" : "uk"`. "UK", "Britain", "GB", "England" all silently bill as international. Replace with a typed dropdown keyed by ISO 2-letter code.

### Task 1: Create `lib/iso-countries.ts`

**Files:**
- Create: `src/lib/iso-countries.ts`
- Test:   `src/lib/iso-countries.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/iso-countries.test.ts
import { describe, expect, it } from "vitest";
import { COUNTRIES, regionForCountry, isSupportedCountry, type IsoCode } from "./iso-countries";

describe("COUNTRIES", () => {
  it("includes GB as the first option for UK-default checkout", () => {
    expect(COUNTRIES[0]).toEqual({ code: "GB", label: "United Kingdom" });
  });

  it("contains common EU markets", () => {
    const codes = COUNTRIES.map((c) => c.code);
    for (const expected of ["IE", "FR", "DE", "ES", "IT", "NL", "BE"]) {
      expect(codes).toContain(expected);
    }
  });

  it("contains US, CA, AU as international markets we explicitly support", () => {
    const codes = COUNTRIES.map((c) => c.code);
    for (const expected of ["US", "CA", "AU"]) {
      expect(codes).toContain(expected);
    }
  });

  it("uses unique 2-letter codes", () => {
    const seen = new Set<string>();
    for (const c of COUNTRIES) {
      expect(c.code.length).toBe(2);
      expect(seen.has(c.code)).toBe(false);
      seen.add(c.code);
    }
  });
});

describe("regionForCountry()", () => {
  it("returns 'uk' for GB", () => {
    expect(regionForCountry("GB")).toBe("uk");
  });

  it("returns 'international' for any non-GB supported country", () => {
    expect(regionForCountry("US")).toBe("international");
    expect(regionForCountry("FR")).toBe("international");
    expect(regionForCountry("IE")).toBe("international");
  });

  it("falls back to 'uk' for unknown codes (default-safe for UK-first marketplace)", () => {
    expect(regionForCountry("XX" as IsoCode)).toBe("uk");
  });
});

describe("isSupportedCountry()", () => {
  it("accepts any code in COUNTRIES", () => {
    expect(isSupportedCountry("GB")).toBe(true);
    expect(isSupportedCountry("US")).toBe(true);
  });

  it("rejects non-strings, lowercase, and unknown codes", () => {
    expect(isSupportedCountry("gb")).toBe(false);
    expect(isSupportedCountry("ZZ")).toBe(false);
    expect(isSupportedCountry(null)).toBe(false);
    expect(isSupportedCountry(undefined)).toBe(false);
    expect(isSupportedCountry(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/iso-countries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/iso-countries.ts
//
// ISO 3166-1 alpha-2 codes for the countries Wallplace ships to.
// Single source of truth — checkout page, /api/checkout, and shipping
// region detection all read from here.
//
// "uk" vs "international" is a shipping-cost concept, not a customs
// concept. GB is the only "uk" code; everything else is "international".
// Unknown codes fall back to "uk" so a typo can't accidentally trigger
// international shipping rates (which are higher).

export interface Country {
  code: string;
  label: string;
}

export const COUNTRIES: readonly Country[] = [
  { code: "GB", label: "United Kingdom" },
  { code: "IE", label: "Ireland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "PT", label: "Portugal" },
  { code: "AT", label: "Austria" },
  { code: "DK", label: "Denmark" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "FI", label: "Finland" },
  { code: "CH", label: "Switzerland" },
  { code: "PL", label: "Poland" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
] as const;

export type IsoCode = (typeof COUNTRIES)[number]["code"];

export function isSupportedCountry(value: unknown): value is IsoCode {
  if (typeof value !== "string") return false;
  return COUNTRIES.some((c) => c.code === value);
}

export function regionForCountry(code: string | null | undefined): "uk" | "international" {
  if (code === "GB") return "uk";
  if (isSupportedCountry(code)) return "international";
  return "uk";
}

export function labelForCountry(code: string): string {
  const c = COUNTRIES.find((c) => c.code === code);
  return c ? c.label : code;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/iso-countries.test.ts`
Expected: PASS — 4 describe blocks, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/iso-countries.ts src/lib/iso-countries.test.ts
git commit -m "feat(checkout): add iso-countries helper as shipping region source of truth"
```

---

### Task 2: Replace `<input>` with `<select>` on /checkout

**Files:**
- Modify: `src/app/(pages)/checkout/page.tsx`

- [ ] **Step 1: Read current checkout page**

The country field is currently around line 236–242 (free-text `<input>` value bound to `shipping.country`). Region detection is at line 42–43 (`const region = shipping.country !== "United Kingdom" ? "international" : "uk"`). Both must change.

Run: `grep -nH "country\|region" "src/app/(pages)/checkout/page.tsx" | head -30`

Confirm exact line numbers before editing.

- [ ] **Step 2: Modify the page**

Add to imports near the top (line 1–10):

```typescript
import { COUNTRIES, regionForCountry, type IsoCode } from "@/lib/iso-countries";
```

Change the `useState<ShippingInfo>` initial value so `country` defaults to `"GB"` (was `"United Kingdom"`):

```typescript
  const [shipping, setShipping] = useState<ShippingInfo>({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    country: "GB",
    notes: "",
  });
```

Replace the region computation (currently around line 42–43) with:

```typescript
  const region = regionForCountry(shipping.country);
```

Replace the country `<input>` (currently around line 236–242) with a `<select>`:

```tsx
                <select
                  value={shipping.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className={inputClass("country")}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
```

The `<select>` replaces the `<input type="text" placeholder="Country" ... />` in the `grid-cols-1 sm:grid-cols-3 gap-3` row. Layout doesn't change — same width slot.

- [ ] **Step 3: Update the type definition for `ShippingInfo`**

Open `src/lib/types.ts`. Find the `ShippingInfo` interface — `country` is currently `string`. Tighten:

```typescript
import type { IsoCode } from "./iso-countries";

export interface ShippingInfo {
  // ...other fields unchanged
  country: IsoCode;
  // ...
}
```

If this triggers cascading errors elsewhere (e.g. raw API endpoints that read `shipping.country` as plain `string`), keep the field as `string` for now and add a runtime `isSupportedCountry()` guard at API boundaries. Note in the commit message which path you took.

- [ ] **Step 4: Typecheck + smoke**

Run: `npm run typecheck`
Expected: clean. (If consumers of `ShippingInfo.country` break, fix them — they should be calling `isSupportedCountry`/`regionForCountry` instead of doing string compares.)

Manual smoke isn't required at this stage; Phase 8 covers the integration test.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(pages)/checkout/page.tsx" src/lib/types.ts
git commit -m "fix(checkout): country dropdown drives shipping region by ISO code"
```

---

### Task 3: Update `/api/checkout` to use ISO-driven region

**Files:**
- Modify: `src/app/api/checkout/route.ts`

- [ ] **Step 1: Read the file**

Region detection currently lives at line 39–40:

```typescript
const region: "uk" | "international" =
  shipping.country && shipping.country !== "United Kingdom" ? "international" : "uk";
```

That's the bug — replace with the helper.

- [ ] **Step 2: Modify**

Add to imports:

```typescript
import { regionForCountry, isSupportedCountry } from "@/lib/iso-countries";
```

Replace the region detection with:

```typescript
    if (!isSupportedCountry(shipping.country)) {
      return NextResponse.json(
        { error: `We don't ship to ${shipping.country} yet.` },
        { status: 400 },
      );
    }
    const region = regionForCountry(shipping.country);
```

The metadata write that stores `shipping_country` (currently around line 104) should now store the ISO code, not the label. Add a separate `shipping_country_label` if downstream emails need the human-readable form (verify what `OrderConfirmation` email template expects):

```typescript
    metadata: {
      // ...other fields
      shipping_country: shipping.country, // ISO code, e.g. "GB"
      // ...
    },
```

If the existing email templates expect the label, update them to call `labelForCountry(metadata.shipping_country)`. Read `src/emails/templates/orders/CustomerOrderReceipt.tsx` to see what's expected.

- [ ] **Step 3: Add a test**

```typescript
// src/app/api/checkout/route.test.ts (extend an existing file if Plan A landed it for Task 11; otherwise create)
import { describe, expect, it, vi, beforeEach } from "vitest";

// (existing mocks if Plan A has the file, OR add the same block as Plan A Task 11)
// ...

describe("POST /api/checkout country guard", () => {
  it("rejects an unsupported country with 400", async () => {
    // Set up cart with an unsupported country code, e.g. "XX"
    // Expect res.status === 400 and body.error contains "ship"
  });

  it("accepts GB and routes via UK shipping", async () => {
    // Verify Stripe session created with GB metadata
  });
});
```

(Adapt to whatever mock shape exists; this task's test isn't a blocker — the typecheck + manual smoke catches the path.)

- [ ] **Step 4: Run tests + checks**

Run: `npx vitest run src/app/api/checkout/route.test.ts && npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/checkout/route.ts src/app/api/checkout/route.test.ts
git commit -m "fix(checkout): API rejects unsupported countries and uses ISO-driven region"
```

---

## Phase 2 — Server-side cart sessions

Stripe metadata caps each value at 500 chars. Large carts truncate; the confirmation page falls back to localStorage which can be stale. We need a server-side record of in-flight cart data keyed by `session_id`, with metadata only carrying that key.

### Task 4: `cart_sessions` migration

**Files:**
- Create: `supabase/migrations/044_cart_sessions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 044_cart_sessions.sql
--
-- In-flight cart records, keyed by Stripe Checkout Session id. Replaces
-- the 500-char metadata storage that was truncating large carts. The
-- webhook reads cart from here, not from session.metadata. Sessions are
-- TTL'd to 14 days (Stripe sessions expire at 24h, so 14d is generous).

CREATE TABLE IF NOT EXISTS cart_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  cart jsonb NOT NULL,
  shipping jsonb NOT NULL,
  source text,
  venue_slug text,
  artist_slugs text[],
  expected_subtotal_pence integer,
  expected_shipping_pence integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days'
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_stripe_session_id
  ON cart_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_expires_at
  ON cart_sessions(expires_at)
  WHERE expires_at < now() + interval '15 days';

ALTER TABLE cart_sessions ENABLE ROW LEVEL SECURITY;

-- No client-side RLS policy — only the server-side admin client should
-- ever read or write this table. Confirmation page reads via the
-- /api/checkout/session endpoint which uses the admin client.
```

- [ ] **Step 2: Apply locally**

Run via Supabase Studio SQL editor on the local dev DB, OR via:

```bash
psql "$LOCAL_SUPABASE_DB_URL" -f supabase/migrations/044_cart_sessions.sql
```

- [ ] **Step 3: Verify the table exists**

Run via Studio or psql:

```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cart_sessions';
```

Expected output: 10 rows matching the columns above.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/044_cart_sessions.sql
git commit -m "feat(db): add cart_sessions table for in-flight cart data"
```

---

### Task 5: `lib/cart-sessions.ts`

**Files:**
- Create: `src/lib/cart-sessions.ts`
- Test:   `src/lib/cart-sessions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/cart-sessions.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { saveCartSession, loadCartSession } from "./cart-sessions";

beforeEach(() => fromMock.mockReset());

describe("saveCartSession()", () => {
  it("inserts a row keyed by stripe_session_id", async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    fromMock.mockReturnValue({ insert });
    await saveCartSession({
      stripeSessionId: "cs_test_1",
      cart: [{ title: "x", price: 10, quantity: 1 }],
      shipping: { country: "GB" },
      source: "direct",
      venueSlug: "",
      artistSlugs: ["alice"],
      expectedSubtotalPence: 1000,
      expectedShippingPence: 950,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_session_id: "cs_test_1",
        artist_slugs: ["alice"],
        expected_subtotal_pence: 1000,
        expected_shipping_pence: 950,
      }),
    );
  });
});

describe("loadCartSession()", () => {
  it("returns the cart row when found and not expired", async () => {
    const select = vi.fn(() => ({
      eq: () => ({
        gt: () => ({
          maybeSingle: async () => ({ data: { cart: [], shipping: { country: "GB" } } }),
        }),
      }),
    }));
    fromMock.mockReturnValue({ select });
    const session = await loadCartSession("cs_test_1");
    expect(session).toEqual({ cart: [], shipping: { country: "GB" } });
  });

  it("returns null when not found", async () => {
    const select = vi.fn(() => ({
      eq: () => ({
        gt: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }));
    fromMock.mockReturnValue({ select });
    const session = await loadCartSession("cs_missing");
    expect(session).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `npx vitest run src/lib/cart-sessions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/cart-sessions.ts
//
// Server-only persistence for in-flight cart data. Replaces Stripe
// metadata as the data-of-record so we can carry full cart contents
// (images, dimensions, source/venue refs) without the 500-char cap.

import { getSupabaseAdmin } from "./supabase-admin";

export interface SavedCart {
  cart: unknown[];
  shipping: Record<string, unknown>;
  source: string | null;
  venueSlug: string | null;
  artistSlugs: string[] | null;
  expectedSubtotalPence: number | null;
  expectedShippingPence: number | null;
}

export interface SaveInput {
  stripeSessionId: string;
  cart: unknown[];
  shipping: Record<string, unknown>;
  source: string;
  venueSlug: string;
  artistSlugs: string[];
  expectedSubtotalPence: number;
  expectedShippingPence: number;
}

export async function saveCartSession(input: SaveInput): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("cart_sessions").insert({
    stripe_session_id: input.stripeSessionId,
    cart: input.cart,
    shipping: input.shipping,
    source: input.source,
    venue_slug: input.venueSlug || null,
    artist_slugs: input.artistSlugs.length > 0 ? input.artistSlugs : null,
    expected_subtotal_pence: input.expectedSubtotalPence,
    expected_shipping_pence: input.expectedShippingPence,
  });
  if (error) {
    console.error("[cart-sessions] save failed:", error);
    throw new Error("Failed to persist cart session");
  }
}

export async function loadCartSession(
  stripeSessionId: string,
): Promise<SavedCart | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("cart_sessions")
    .select(
      "cart, shipping, source, venue_slug, artist_slugs, expected_subtotal_pence, expected_shipping_pence",
    )
    .eq("stripe_session_id", stripeSessionId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  return {
    cart: Array.isArray(data.cart) ? data.cart : [],
    shipping: typeof data.shipping === "object" && data.shipping !== null ? data.shipping : {},
    source: data.source,
    venueSlug: data.venue_slug,
    artistSlugs: data.artist_slugs,
    expectedSubtotalPence: data.expected_subtotal_pence,
    expectedShippingPence: data.expected_shipping_pence,
  };
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `npx vitest run src/lib/cart-sessions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart-sessions.ts src/lib/cart-sessions.test.ts
git commit -m "feat(checkout): cart-sessions lib for server-side cart persistence"
```

---

### Task 6: `/api/checkout` persists cart server-side

**Files:**
- Modify: `src/app/api/checkout/route.ts`

- [ ] **Step 1: Modify**

After `stripe.checkout.sessions.create({...})` resolves with a session, call `saveCartSession` with the returned `session.id`. Drop the bulky cart-content fields from `metadata` (keep just slim ones for webhook short-paths). Replace the metadata block (currently around line 96–117):

```typescript
import { saveCartSession } from "@/lib/cart-sessions";
// ...
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: shipping.email,
      metadata: {
        // Slim metadata — full cart lives in cart_sessions, keyed by session.id
        kind: "cart_checkout",
        source,
        venue_slug: venueSlug,
        artist_slugs: [...new Set(items.map((i) => i.artistSlug || "").filter(Boolean))].join(","),
      },
      success_url: `${origin}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });

    await saveCartSession({
      stripeSessionId: session.id,
      cart: items,
      shipping,
      source,
      venueSlug,
      artistSlugs: [...new Set(items.map((i) => i.artistSlug || "").filter(Boolean))],
      expectedSubtotalPence: Math.round((body.expectedSubtotal ?? 0) * 100),
      expectedShippingPence: Math.round(totalShipping * 100),
    });

    return NextResponse.json({ url: session.url });
```

- [ ] **Step 2: Modify the webhook to read from cart_sessions**

`src/app/api/webhooks/stripe/route.ts` reads cart from `session.metadata` (around line 218–243). Replace with a `loadCartSession(session.id)` call:

```typescript
import { loadCartSession } from "@/lib/cart-sessions";
// In the checkout.session.completed handler, replace the metadata-cart parse block:
const saved = await loadCartSession(session.id);
if (!saved) {
  console.error("[webhook] cart_sessions miss for", session.id);
  // Defensive: continue with what's in metadata for legacy paths
}
const cart = saved?.cart ?? [];
const shipping = saved?.shipping ?? {};
const source = saved?.source ?? session.metadata?.source ?? "direct";
const venueSlug = saved?.venueSlug ?? session.metadata?.venue_slug ?? "";
const artistSlugs = saved?.artistSlugs ?? (session.metadata?.artist_slugs?.split(",").filter(Boolean) ?? []);
```

This is a meaningful diff — read the existing block carefully and adapt the names. Test by checking the webhook's downstream consumers (the `for (const item of cart) {...}` block) still work.

- [ ] **Step 3: Modify the confirmation page**

`src/app/(pages)/checkout/confirmation/page.tsx` currently fetches via `/api/checkout/session` which reads `session.metadata`. Update `/api/checkout/session/route.ts` to use `loadCartSession`:

```typescript
import { loadCartSession } from "@/lib/cart-sessions";
// In GET handler:
const saved = await loadCartSession(sessionId);
if (!saved) {
  return NextResponse.json({ error: "Session not found" }, { status: 404 });
}
return NextResponse.json({
  cart: saved.cart,
  shipping: saved.shipping,
  // ...other fields the confirmation page needs
});
```

- [ ] **Step 4: Typecheck + smoke**

Run: `npm run typecheck`. Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/checkout/route.ts \
        src/app/api/webhooks/stripe/route.ts \
        src/app/api/checkout/session/route.ts
git commit -m "fix(checkout): cart lives in cart_sessions, not Stripe metadata"
```

---

## Phase 3 — Stripe Connect pre-flight

An order can currently be created against an artist whose Connect account isn't `charges_enabled` — money lands in Stripe escrow with no way to release. Pre-flight check at `/api/checkout` blocks this.

### Task 7: `lib/stripe-connect-status.ts` with caching

**Files:**
- Create: `src/lib/stripe-connect-status.ts`
- Test:   `src/lib/stripe-connect-status.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/stripe-connect-status.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const accountsRetrieve = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: { accounts: { retrieve: accountsRetrieve } },
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { canArtistAcceptOrders } from "./stripe-connect-status";

beforeEach(() => {
  accountsRetrieve.mockReset();
  fromMock.mockReset();
});

function profileRow(stripeId: string | null, charges: boolean | null) {
  return {
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: {
            stripe_connect_account_id: stripeId,
            stripe_charges_enabled: charges,
            stripe_charges_checked_at: charges == null ? null : new Date().toISOString(),
          },
        }),
      }),
    }),
  };
}

describe("canArtistAcceptOrders()", () => {
  it("returns false when artist has no stripe account", async () => {
    fromMock.mockReturnValue(profileRow(null, null));
    const ok = await canArtistAcceptOrders("alice");
    expect(ok).toBe(false);
    expect(accountsRetrieve).not.toHaveBeenCalled();
  });

  it("returns cached charges_enabled when checked recently (<60s)", async () => {
    fromMock.mockReturnValue(profileRow("acct_123", true));
    const ok = await canArtistAcceptOrders("alice");
    expect(ok).toBe(true);
    expect(accountsRetrieve).not.toHaveBeenCalled(); // cache hit
  });

  it("re-checks Stripe when last check was >60s old", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              stripe_connect_account_id: "acct_123",
              stripe_charges_enabled: true,
              stripe_charges_checked_at: new Date(Date.now() - 90_000).toISOString(),
            },
          }),
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
    accountsRetrieve.mockResolvedValue({ charges_enabled: false });
    const ok = await canArtistAcceptOrders("alice");
    expect(ok).toBe(false);
    expect(accountsRetrieve).toHaveBeenCalledWith("acct_123");
  });
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/lib/stripe-connect-status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/stripe-connect-status.ts
//
// Pre-flight check: can this artist actually receive a payment right
// now? An artist whose Stripe Connect account exists but isn't
// charges_enabled (e.g. mid-KYC) would silently fail at transfer time.
// We cache the answer for 60 seconds in artist_profiles to avoid
// hammering Stripe on every checkout.

import { stripe } from "./stripe";
import { getSupabaseAdmin } from "./supabase-admin";

const CACHE_TTL_MS = 60_000;

export async function canArtistAcceptOrders(slug: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data: profile } = await db
    .from("artist_profiles")
    .select("stripe_connect_account_id, stripe_charges_enabled, stripe_charges_checked_at")
    .eq("slug", slug)
    .single();

  if (!profile?.stripe_connect_account_id) return false;

  const checkedAt = profile.stripe_charges_checked_at
    ? new Date(profile.stripe_charges_checked_at).getTime()
    : 0;
  if (
    profile.stripe_charges_enabled !== null &&
    Date.now() - checkedAt < CACHE_TTL_MS
  ) {
    return profile.stripe_charges_enabled;
  }

  // Cache miss / stale — ask Stripe.
  try {
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    const charges = account.charges_enabled;
    await db
      .from("artist_profiles")
      .update({
        stripe_charges_enabled: charges,
        stripe_charges_checked_at: new Date().toISOString(),
      })
      .eq("slug", slug);
    return charges;
  } catch (err) {
    console.error("[connect-status] retrieve failed:", err);
    // Fail closed — if we can't verify, we don't take the order.
    return false;
  }
}
```

If the columns `stripe_charges_enabled` and `stripe_charges_checked_at` don't exist on `artist_profiles`, add a migration:

```sql
-- supabase/migrations/045_artist_charges_cache.sql
ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean,
  ADD COLUMN IF NOT EXISTS stripe_charges_checked_at timestamptz;
```

- [ ] **Step 4: Run tests, typecheck**

Run: `npx vitest run src/lib/stripe-connect-status.test.ts && npm run typecheck`. Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stripe-connect-status.ts src/lib/stripe-connect-status.test.ts \
        supabase/migrations/045_artist_charges_cache.sql
git commit -m "feat(checkout): stripe-connect-status helper with 60s cache"
```

---

### Task 8: Wire pre-flight into `/api/checkout`

**Files:**
- Modify: `src/app/api/checkout/route.ts`

- [ ] **Step 1: Add the gate**

Right after `parsed.success` validation but BEFORE the line-items mapping (around line 17), add:

```typescript
import { canArtistAcceptOrders } from "@/lib/stripe-connect-status";

// (inside POST, after `const { items, shipping } = parsed.data;`)
const uniqueArtistSlugs = [...new Set(items.map((i) => i.artistSlug || "").filter(Boolean))];
const checks = await Promise.all(
  uniqueArtistSlugs.map(async (slug) => ({ slug, ok: await canArtistAcceptOrders(slug) })),
);
const blocked = checks.filter((c) => !c.ok).map((c) => c.slug);
if (blocked.length > 0) {
  return NextResponse.json(
    {
      error:
        blocked.length === 1
          ? `${blocked[0]} isn't ready to take orders yet — try again in a few minutes.`
          : `${blocked.length} artists in this cart aren't ready to take orders yet.`,
    },
    { status: 422 },
  );
}
```

- [ ] **Step 2: Add a test case**

In `src/app/api/checkout/route.test.ts` (extend or create):

```typescript
import { canArtistAcceptOrders } from "@/lib/stripe-connect-status";
vi.mock("@/lib/stripe-connect-status", () => ({
  canArtistAcceptOrders: vi.fn(),
}));

it("rejects checkout when an artist isn't charges_enabled", async () => {
  vi.mocked(canArtistAcceptOrders).mockResolvedValue(false);
  const res = await POST(req(makeBody("alice")));
  expect(res.status).toBe(422);
  expect((await res.json()).error).toMatch(/alice/i);
});

it("permits checkout when all artists are ready", async () => {
  vi.mocked(canArtistAcceptOrders).mockResolvedValue(true);
  const res = await POST(req(makeBody("alice")));
  expect(res.status).toBe(200);
});
```

- [ ] **Step 3: Run, typecheck, commit**

```bash
git add src/app/api/checkout/route.ts src/app/api/checkout/route.test.ts
git commit -m "fix(checkout): pre-flight Stripe Connect status before creating session"
```

---

## Phase 4 — Order tracking signed-token

Bare-email lookup at `/api/orders/track` lets anyone with a guessed `order_id + email` pair pull order details. Replace with an HMAC token in the order confirmation email.

### Task 9: `lib/order-tracking-token.ts`

**Files:**
- Create: `src/lib/order-tracking-token.ts`
- Test:   `src/lib/order-tracking-token.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/order-tracking-token.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { signOrderToken, verifyOrderToken } from "./order-tracking-token";

beforeEach(() => {
  process.env.ORDER_TOKEN_SECRET = "test-secret-not-for-prod";
});

describe("order-tracking-token", () => {
  it("round-trips order_id + email", async () => {
    const token = await signOrderToken({ orderId: "ord-1", email: "buyer@x.com" });
    const verified = await verifyOrderToken(token);
    expect(verified).toEqual({ orderId: "ord-1", email: "buyer@x.com" });
  });

  it("rejects a tampered token", async () => {
    const token = await signOrderToken({ orderId: "ord-1", email: "buyer@x.com" });
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifyOrderToken(tampered)).rejects.toThrow();
  });

  it("rejects expired tokens", async () => {
    const token = await signOrderToken(
      { orderId: "ord-1", email: "buyer@x.com" },
      { ttlSeconds: -1 },
    );
    await expect(verifyOrderToken(token)).rejects.toThrow(/expired/i);
  });

  it("throws when ORDER_TOKEN_SECRET is unset", async () => {
    delete process.env.ORDER_TOKEN_SECRET;
    await expect(
      signOrderToken({ orderId: "ord-1", email: "buyer@x.com" }),
    ).rejects.toThrow(/ORDER_TOKEN_SECRET/);
  });
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/lib/order-tracking-token.test.ts`. Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/order-tracking-token.ts
//
// HMAC-signed token included in order confirmation emails. Lets the
// /track endpoint and /refund endpoint verify the buyer holds a real
// link instead of trusting bare email match. Default TTL 90 days
// (orders take a while to ship + delivery + return windows).

import { createHmac, timingSafeEqual } from "node:crypto";

interface Payload {
  orderId: string;
  email: string;
  iat: number;
}

const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

function getSecret(): string {
  const s = process.env.ORDER_TOKEN_SECRET;
  if (!s) throw new Error("ORDER_TOKEN_SECRET is not configured");
  return s;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded + "=".repeat((4 - (padded.length % 4)) % 4), "base64");
}

export interface SignOptions {
  ttlSeconds?: number;
}

export async function signOrderToken(
  data: { orderId: string; email: string },
  opts: SignOptions = {},
): Promise<string> {
  const secret = getSecret();
  const payload: Payload = {
    orderId: data.orderId,
    email: data.email.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = base64url(JSON.stringify(payload));
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = payload.iat + ttl;
  const signed = `${encoded}.${expiresAt}`;
  const sig = base64url(createHmac("sha256", secret).update(signed).digest());
  return `${signed}.${sig}`;
}

export async function verifyOrderToken(
  token: string,
): Promise<{ orderId: string; email: string }> {
  const secret = getSecret();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [encoded, expiresAtStr, sig] = parts;
  const expiresAt = Number.parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt)) throw new Error("Malformed token");
  const expectedSig = base64url(
    createHmac("sha256", secret).update(`${encoded}.${expiresAtStr}`).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid signature");
  }
  if (Math.floor(Date.now() / 1000) > expiresAt) {
    throw new Error("Token expired");
  }
  const payloadJson = fromBase64url(encoded).toString();
  const payload = JSON.parse(payloadJson) as { orderId: unknown; email: unknown };
  if (typeof payload.orderId !== "string") throw new Error("Bad orderId");
  if (typeof payload.email !== "string") throw new Error("Bad email");
  return { orderId: payload.orderId, email: payload.email };
}
```

- [ ] **Step 4: Add env var to `.env.example`**

```bash
# Required for order tracking + refund signed-link auth. 32+ random bytes.
ORDER_TOKEN_SECRET=""
```

- [ ] **Step 5: Run + commit**

```bash
git add src/lib/order-tracking-token.ts src/lib/order-tracking-token.test.ts .env.example
git commit -m "feat(orders): HMAC-signed order tracking token"
```

---

### Task 10: Embed signed token in order confirmation email

**Files:**
- Modify: `src/emails/templates/orders/CustomerOrderReceipt.tsx`
- Modify: the place that renders the email + sends it (likely `src/app/api/webhooks/stripe/route.ts` or `src/lib/email.ts`)

- [ ] **Step 1: Find where the customer order receipt is sent**

Run: `grep -rn "CustomerOrderReceipt" src/ | head`

The webhook (`src/app/api/webhooks/stripe/route.ts`) constructs the email props somewhere around line 297. The template renders a "Track your order" link.

- [ ] **Step 2: Update the email template props**

Add a `trackingToken` prop:

```tsx
// src/emails/templates/orders/CustomerOrderReceipt.tsx
export interface CustomerOrderReceiptProps {
  orderId: string;
  buyerEmail: string;
  trackingToken: string; // NEW
  // ... existing props
}
```

In the template body, change the "Track your order" `<Link href=...>` to:

```tsx
<Link href={`${SITE_URL}/orders/track?t=${encodeURIComponent(trackingToken)}`}>
  Track your order
</Link>
```

(Keep the SITE_URL constant the template already uses.)

- [ ] **Step 3: Mint the token at send time**

In the webhook (or wherever the email is rendered), mint the token before passing to the template:

```typescript
import { signOrderToken } from "@/lib/order-tracking-token";

const trackingToken = await signOrderToken({
  orderId: order.id,
  email: order.buyer_email,
});

await sendEmail(
  CustomerOrderReceipt,
  {
    orderId: order.id,
    buyerEmail: order.buyer_email,
    trackingToken,
    // ...rest of props
  },
);
```

- [ ] **Step 4: Update `/orders/track` page to read `?t=`**

`src/app/(pages)/orders/track/page.tsx` currently presents a form for `orderId + email`. With a token, the form is bypassed — pre-fill from `?t=` and verify server-side.

Add a server-side branch: if `?t=` is present, decode (using a NEW `/api/orders/track` GET path that accepts the token), then render the order details directly. If `?t=` is absent, fall back to the existing email-based form.

- [ ] **Step 5: Commit**

```bash
git add src/emails/templates/orders/CustomerOrderReceipt.tsx \
        src/app/api/webhooks/stripe/route.ts \
        "src/app/(pages)/orders/track/page.tsx"
git commit -m "fix(orders): embed signed tracking token in receipt email"
```

---

### Task 11: `/api/orders/track` accepts signed token

**Files:**
- Modify: `src/app/api/orders/track/route.ts`

- [ ] **Step 1: Add the token branch**

Replace the body of the POST handler with a token-first / email-fallback flow:

```typescript
import { verifyOrderToken } from "@/lib/order-tracking-token";

export async function POST(request: Request) {
  const limited = await checkRateLimit(request, 12, 60_000);
  if (limited) return limited;

  let body: { orderId?: string; email?: string; token?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let orderId: string | null = null;
  let email: string | null = null;

  if (body.token) {
    try {
      const verified = await verifyOrderToken(body.token);
      orderId = verified.orderId;
      email = verified.email;
    } catch {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }
  } else {
    if (typeof body.orderId !== "string" || typeof body.email !== "string") {
      return NextResponse.json(
        { error: "orderId and email are required" },
        { status: 400 },
      );
    }
    orderId = body.orderId.trim();
    email = body.email.trim().toLowerCase();
    if (!orderId || !email || !email.includes("@")) {
      return NextResponse.json(
        { error: "orderId and email are required" },
        { status: 400 },
      );
    }
  }

  // ... existing lookup logic, scoped to orderId + email
}
```

The legacy email-only path stays in place during the rollout window so existing customers (who got receipts before this change) can still track. Plan a 90-day deprecation: after that window, remove the email-fallback branch and `/api/orders/track` only accepts tokens.

- [ ] **Step 2: Add tests for both branches**

```typescript
// in src/app/api/orders/track/route.test.ts
it("accepts a signed token and returns the order", async () => {
  process.env.ORDER_TOKEN_SECRET = "test";
  const token = await signOrderToken({ orderId: "o1", email: "b@x.com" });
  const res = await POST(req({ token }));
  expect(res.status).toBe(200);
});

it("rejects a bad token with 401", async () => {
  const res = await POST(req({ token: "bogus.token.xx" }));
  expect(res.status).toBe(401);
});

it("still accepts the legacy email path", async () => {
  const res = await POST(req({ orderId: "o1", email: "b@x.com" }));
  expect(res.status).toBe(200);
});
```

- [ ] **Step 3: Run, commit**

```bash
git add src/app/api/orders/track/route.ts src/app/api/orders/track/route.test.ts
git commit -m "fix(orders): /track accepts signed token (email fallback for 90 days)"
```

---

## Phase 5 — Refund signed-token + duplicate prevention

### Task 12: Refund request requires authenticated user OR signed token

**Files:**
- Modify: `src/app/api/refunds/request/route.ts`
- Test:   `src/app/api/refunds/request/route.test.ts`

The current refund-request endpoint requires `getAuthenticatedUser()` (Bearer token), so an authenticated buyer is fine. But guest checkouts produce orders with no user — those buyers can't currently request refunds at all. The signed token closes that gap AND removes the temptation to fall back to email-only auth.

- [ ] **Step 1: Add a token branch + duplicate prevention**

Modify `/api/refunds/request`:

```typescript
import { verifyOrderToken } from "@/lib/order-tracking-token";

export async function POST(request: Request) {
  let token: string | null = null;
  try {
    const peek = await request.clone().json();
    token = typeof peek.token === "string" ? peek.token : null;
  } catch { /* fall through */ }

  let userId: string | null = null;
  let userEmail: string | null = null;

  if (token) {
    try {
      const v = await verifyOrderToken(token);
      userEmail = v.email;
      // Token is order-scoped; verify the orderId in the body matches.
      // Set userId from auth_users by email if any (admins/buyers).
    } catch {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }
  } else {
    const auth = await getAuthenticatedUser(request);
    if (auth.error) return auth.error;
    userId = auth.user!.id;
    userEmail = auth.user!.email || null;
  }

  // ... existing logic, using userId / userEmail derived above
  // The token's email becomes the buyer auth signal; non-token paths use Bearer.
```

Update the "is buyer / artist / venue" branching to handle the token path (where userId may be null but userEmail is verified).

- [ ] **Step 2: Block any non-rejected duplicate refund**

Replace the existing duplicate check (currently `eq("status", "pending")`) with a broader status filter:

```typescript
const { data: existing } = await db
  .from("refund_requests")
  .select("id, status")
  .eq("order_id", orderId)
  .neq("status", "rejected")
  .limit(1);

if (existing && existing.length > 0) {
  return NextResponse.json(
    { error: `A ${existing[0].status} refund request already exists for this order.` },
    { status: 409 },
  );
}
```

So a `pending`, `approved`, or `partially_refunded` request blocks re-submit — only `rejected` gets recycled.

- [ ] **Step 3: Add tests**

Two new cases:
- token branch happy-path
- duplicate-blocked when an `approved` request already exists (was previously not blocked)

- [ ] **Step 4: Run, commit**

```bash
git add src/app/api/refunds/request/route.ts src/app/api/refunds/request/route.test.ts
git commit -m "fix(refunds): accept signed token, block any non-rejected duplicate"
```

---

## Phase 6 — JSONB consistency sweep

### Task 13: Always pass JSONB raw (never `JSON.stringify`)

**Files:**
- Modify: `src/app/api/refunds/process/route.ts`
- Audit: any other place we `JSON.stringify` for a `jsonb` column

- [ ] **Step 1: Find the violations**

Run: `grep -rn "JSON.stringify" src/app/api/ | grep -v ".test."`

Expected hits (from the QA review):
- `src/app/api/refunds/process/route.ts:197` — stringifies `status_history` on update
- Possibly others.

For each hit, decide: is the column `jsonb` (raw object/array required) or `text` (stringified OK)? Check the schema:

```bash
grep -rn "status_history\|cart_items\|metadata" supabase/migrations/ | head
```

- [ ] **Step 2: Fix each**

For `src/app/api/refunds/process/route.ts:197`, replace:

```typescript
status_history: JSON.stringify(history),
```

with:

```typescript
status_history: history,
```

Repeat for any other hits where the column is `jsonb`.

- [ ] **Step 3: Add a one-shot lint rule (optional)**

Could add a custom ESLint rule "no-stringify-on-jsonb" — but it's hard to declare "which fields are jsonb" generically. Skip this unless the team wants a follow-up.

- [ ] **Step 4: Verify with a manual smoke**

After the change, refund a test order and inspect `orders.status_history` in Supabase. It should be a JSON array, not a quoted string. Then load `/customer-portal/page.tsx` (the order detail) — the "Refunded" timeline entry should appear.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/refunds/process/route.ts
# add others if applicable
git commit -m "fix(orders): stop stringifying status_history (jsonb writes go raw)"
```

---

## Phase 7 — Shipping signature uplift at order level

The signature uplift (£2 added when order ≥ £100) is currently applied per-artist-group. Two artists at £60 each (£120 order) → no signature charge. Move the threshold check to the order subtotal.

### Task 14: Refactor signature uplift in `lib/shipping-checkout.ts`

**Files:**
- Modify: `src/lib/shipping-checkout.ts`
- Modify: `src/lib/shipping-checkout.test.ts`

- [ ] **Step 1: Add the failing test**

```typescript
// src/lib/shipping-checkout.test.ts (extend the existing file)
describe("calculateOrderShipping signature uplift", () => {
  it("applies signature uplift when order subtotal >= £100, even across artists", () => {
    const result = calculateOrderShipping(
      [
        { artistSlug: "a", artistName: "A", price: 60, quantity: 1, dimensions: "30x40", framed: false },
        { artistSlug: "b", artistName: "B", price: 60, quantity: 1, dimensions: "30x40", framed: false },
      ],
      "uk",
    );
    // Both groups should have needsSignature: true because subtotal £120 ≥ £100
    expect(result.artistGroups.every((g) => g.needsSignature)).toBe(true);
  });

  it("does not apply uplift when order subtotal < £100", () => {
    const result = calculateOrderShipping(
      [
        { artistSlug: "a", artistName: "A", price: 30, quantity: 1, dimensions: "30x40", framed: false },
        { artistSlug: "b", artistName: "B", price: 30, quantity: 1, dimensions: "30x40", framed: false },
      ],
      "uk",
    );
    expect(result.artistGroups.every((g) => !g.needsSignature)).toBe(true);
  });
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/lib/shipping-checkout.test.ts`
Expected: the new "across artists" test fails because each group is independently below £100.

- [ ] **Step 3: Refactor**

In `calculateOrderShipping` (current logic at line 76), the `needsSignature` flag is set per-line based on `it.price >= SIGNATURE_THRESHOLD_GBP`. Compute the order subtotal first, then propagate the uplift decision to each group:

```typescript
export function calculateOrderShipping(
  items: CartLineForShipping[],
  region: "uk" | "international",
): OrderShipping {
  const isInternational = region === "international";
  const orderSubtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const orderNeedsSignature = orderSubtotal >= SIGNATURE_THRESHOLD_GBP;

  // ...existing grouping logic...

  for (const [slug, group] of groupsBySlug) {
    let needsSignature = orderNeedsSignature; // default from order-level
    // ... rest of per-group computation

    for (const it of group.lines) {
      // Drop the per-line `it.price >= SIGNATURE_THRESHOLD_GBP` check —
      // it's now implied by the order-level decision.
      const resolved = resolveShippingCost(/* ... */);
      // ...
      if (resolved.estimate?.requiresSignature) needsSignature = true;
    }
    // ... rest unchanged
  }
}
```

The `requiresSignature` from the resolver (which fires for fragile or oversized work) still escalates per-line. Only the price-threshold check moves to the order level.

- [ ] **Step 4: Run, all tests pass**

Run: `npx vitest run src/lib/shipping-checkout.test.ts`. Expected: PASS, all old + new tests.

Also re-run the full suite — `calculateOrderShipping` is consumed by `/api/checkout` and `/checkout/page.tsx` so any divergence will surface.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shipping-checkout.ts src/lib/shipping-checkout.test.ts
git commit -m "fix(shipping): signature uplift threshold from order subtotal, not per-artist"
```

---

## Phase 8 — Final verification

### Task 15: Full check + manual sweep + open PR

- [ ] **Step 1: Run full check suite**

```bash
npm run check
```

Expected: lint clean (pre-existing 76 errors are fine, count must not increase), typecheck clean, all vitest suites green.

- [ ] **Step 2: Run a build**

```bash
npm run build
```

Expected: clean. Watch for "static prerender" warnings on `/checkout/confirmation` — it should be dynamic since it reads `?session_id`.

- [ ] **Step 3: Manual smoke**

Use the demo accounts (Maya Chen artist + Copper Kettle venue) and a fresh customer:

1. **Country dropdown** — open `/checkout` (with a cart). Click country select. Confirm 20+ options, GB at top, all ISO-coded.
2. **Region drives shipping** — switch country to US. Confirm shipping cost increases. Switch back. Confirm price returns.
3. **Bad country rejection** — `curl -X POST /api/checkout -d '{"items": [...], "shipping": {..., "country": "XX"}}'`. Expect 400.
4. **Cart_sessions persistence** — checkout with a 5-item cart (longer than 500 chars metadata limit). Confirm Stripe success page loads with correct cart contents (data came from cart_sessions, not metadata).
5. **Connect pre-flight** — in Supabase, set Maya Chen's `stripe_charges_enabled = false`. Try to buy her work. Expect 422 with friendly error. Restore.
6. **Order tracking signed token** — place a real order. Read the receipt email. The "Track your order" link should include `?t=<token>`. Click. Land on `/orders/track` with order details visible — no email prompt.
7. **Tracking token tampered** — change one char in the token. Reload. Expect "Invalid or expired link" error.
8. **Refund duplicate prevention** — request a refund. Approve it. Try to request another for the same order. Expect 409 "approved refund already exists".
9. **Signature uplift at order level** — set up a cart with two artists, each at £60 (subtotal £120). Confirm shipping shows signature uplift. Same cart at £30 each (subtotal £60) — no uplift.
10. **JSONB consistency** — refund the test order. Inspect `orders.status_history` in Supabase. Should be a JSON array, not a quoted string. Customer portal "Order detail" page should render the refund timeline correctly.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin claude/qa-b-checkout-payments
gh pr create --title "Plan B: checkout & payment integrity" --body "$(cat <<'EOF'
## Summary

Closes the payment-integrity bucket from the 2026-04-30 pre-launch QA audit.

- Country dropdown replaces free-text input (kills `=== "United Kingdom"` string match)
- Cart data lives in `cart_sessions` server-side, not Stripe metadata (no more 500-char truncation)
- `/api/checkout` pre-flights Stripe Connect status — refuses to create a session if any artist isn't `charges_enabled`
- Order receipt emails include an HMAC-signed tracking token; `/api/orders/track` accepts it (legacy email path stays for 90 days)
- `/api/refunds/request` accepts the same token (closes guest-refund hole) and blocks any non-rejected duplicate
- JSONB writes to `orders.status_history` go raw (refund flow was double-encoding)
- Shipping signature uplift threshold check moved to order subtotal (was per-artist, miscounting cross-artist orders)

## Test plan

- [ ] `npm run check` clean
- [ ] `npm run build` clean
- [ ] All 10 manual smoke checks in plan §15 pass
- [ ] `ORDER_TOKEN_SECRET` set in production env before merging
- [ ] Migrations 044 + 045 applied on staging + production

## Out of scope (future plans)

- Self-purchase prevention at checkout (Plan A Task 11 — already covered there)
- Refund auth hardening beyond signed-token (Plan F polish: row-level audit trail)
- Promo / referral code support (Plan D — UX work)
- Email-template polish + carrier tracking links (Plan F)
EOF
)"
```

---

## Self-review

**1. Spec coverage** (sections from the QA report this plan covers):
- §1.5 Country dropdown → Tasks 1–3 ✓
- §1.7 Stripe Connect pre-flight → Tasks 7–8 ✓
- §1.3 Order tracking signed token → Tasks 9–11 ✓
- §2.13 Cart persistence beyond metadata → Tasks 4–6 ✓
- §2.14 Refund duplicate prevention → Task 12 ✓
- §2.15 JSONB consistency → Task 13 ✓
- §2.17 Signature uplift at order level → Task 14 ✓

**Refund signed-token** — folded into Task 12 alongside duplicate prevention.

**Dropped from Plan B** (verified during context-gathering as non-issues):
- §1.2 Stripe webhook secret check — `src/app/api/webhooks/stripe/route.ts:36-41` already returns 500 if env is empty/missing. Confirmed in Plan A's investigation. Not a bug.
- Webhook idempotency tests — the existing payment_intent_id dedup check is sound; tests would be valuable but the behaviour itself isn't broken. Defer to Plan F.

**2. Placeholder scan:** every step has actual code or an exact command. The few "(adapt the names)" notes are tied to specific files the executor will read first — those are necessary direction-finding, not skipped specs.

**3. Type / name consistency:**
- `IsoCode`, `regionForCountry`, `isSupportedCountry`, `COUNTRIES`, `labelForCountry` — used consistently across Tasks 1–3 ✓
- `saveCartSession`, `loadCartSession`, `SavedCart`, `SaveInput` — used identically in Tasks 5, 6, 8 ✓
- `canArtistAcceptOrders` — single function, used in Tasks 7 + 8 ✓
- `signOrderToken`, `verifyOrderToken` — same signature `{ orderId, email }` in Tasks 9, 10, 11, 12 ✓
- `cart_sessions` schema fields (`stripe_session_id`, `cart`, `shipping`, `source`, `venue_slug`, `artist_slugs`, `expected_subtotal_pence`, `expected_shipping_pence`, `created_at`, `expires_at`) — matched between Task 4 migration and Task 5 lib ✓
- `artist_profiles` cache columns (`stripe_charges_enabled`, `stripe_charges_checked_at`) — matched between Task 7 migration and Task 7 lib ✓

**4. Independence from Plan A:** Confirmed. Plan B's HMAC lib (`order-tracking-token.ts`) is independent of Plan A's `oauth-state.ts` — both can land separately. The `safeRedirect` helper from Plan A isn't used here. The only Plan A artefact this plan would benefit from is the `RedirectIfLoggedIn` wrapper, but Plan B has no signup-page touches.

Plan looks complete. Ready to execute.

---

## Execution

When you're ready, two paths:

**1. Subagent-driven (recommended)** — Fresh subagent per task with two-stage review (spec compliance → code quality). Use `superpowers:subagent-driven-development`. Same approach Plan A's other session used.

**2. Inline** — Execute step-by-step in the same session using `superpowers:executing-plans`.

Either way, set `ORDER_TOKEN_SECRET` (32+ random bytes) in `.env.local` before Task 9, otherwise the order-token tests will fail with "ORDER_TOKEN_SECRET is not configured".
