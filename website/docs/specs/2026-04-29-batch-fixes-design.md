# 2026-04-29 — Batch fixes design

Design for an 18-item batch of fixes covering Collections, card reveal, placement/inventory/revenue integrity, checkout correctness, email fidelity, and a polish/QA pass. Grouped into six coherent workstreams (A-F). Each workstream gets its own spec section here, then one combined implementation plan, then sequential execution on the same branch.

Working branch: `feat/2026-04-29-batch-fixes` off live `origin/main` (post-fast-forward). 27 modified files of unrelated WIP have been stashed and will be reconciled at the end.

## Up-front decisions

These are the assumption-defaults that anchor the rest of the spec. Any of them can be flipped without rewiring; they're called out here so a reviewer can object before code lands.

| Decision | Choice |
|----------|--------|
| Card overlay info hierarchy | Title (1 line) → Price → Medium (1 line) → "Placed at [Venue]" (if applicable) → action row `Quick view · Open · Buy now`. Web hover, mobile tap. |
| Placement-attributed revenue | Sum of `orders.venue_revenue` (already excludes platform fee and is computed per checkout) for orders where `status='delivered'` and `placement_id` is set. Shipping is excluded from venue revenue (it goes to the artist for fulfilment). |
| "Placed at [Venue]" surface | Two places: artwork card overlay on the artist's portfolio, and as a chip on the public artwork detail page. |
| Em-dash replacement style | En dash (`–`) for ranges, comma/period/colon for prose pauses, never `--` in user-facing text. Code/comments left alone. |
| Placement-type vocabulary | Keep existing DB enum `["free_loan", "revenue_share", "purchase"]`. UI labels already map "Paid Loan" → `free_loan`, "Revenue Share" → `revenue_share`, "Direct Purchase" → `purchase`. No migration. |
| Stock symmetry on placements | Decrement `quantity_available` when placement transitions to `active`; restore when it transitions to a non-active terminal status (`ended`, `collected`, `declined-after-active`). Idempotent via `status_history` checks. |

## Scope

In: 18 items the user listed.

Out: backwards-compat shims for the placement enum (no rename); Resend DNS / domain verification (called out in `src/emails/OUTSTANDING.md`, infra-only); a separate galleries detail page (galleries currently `redirect`s to `/browse?view=gallery`, intentionally).

---

## Workstream A — Collections as a first-class browsing surface

Covers items **1 (request placement)**, **8 (filter bar + mobile layout)**, **15 (UX consistency review)**.

### A1. Extract a shared FilterPanel component

`src/app/(pages)/browse/page.tsx` is currently a 2,366-line monolith with the entire filter UI inline (state declared at lines 92–374, JSX rendered later). The collection detail page (`browse/collections/[collectionId]/page.tsx`) has no filter UI at all.

- New file `src/components/browse/FilterPanel.tsx`. Pure presentational + setter-driven; takes a typed `FilterState` and `onChange`.
- New file `src/components/browse/useFilterState.ts` — hook that owns the state, exposes derived predicates (`matchesPriceRange`, `matchesSize`, `matchesArrangement`, `matchesMedium`, `matchesThemes`).
- `/browse/page.tsx` imports both and replaces the inline blocks. Behaviour unchanged on this surface; only structure moved.
- The FilterPanel takes a `mode` prop: `"works-grid" | "portfolios-grid" | "collections-grid" | "collection-detail"` so each surface can hide filters that don't apply (e.g. distance is meaningful for portfolios, not for works inside a single collection).

Acceptance: snapshot test that the `/browse` filter behaviour is identical post-refactor (selectable filters, counts, URL persistence).

### A2. Wire FilterPanel into the collection detail page

`src/app/(pages)/browse/collections/[collectionId]/page.tsx`:

- Add `useFilterState({ mode: "collection-detail" })` and `<FilterPanel />` above the works grid.
- Filter the `collection.works` array client-side using the same predicates as the main browse page.
- Mobile: filter panel sits in a slide-up drawer triggered by a sticky "Filters" button at the top-right of the works grid. Web: filter sidebar on the left (matches `/browse` layout pattern); on tablet and below, collapses to the drawer.
- Filters that apply on a collection: size, price, medium/style, originals/prints/framing, arrangement (rev share / paid loan / direct purchase). Filters that don't: distance (single-artist context), venue types, themes (collection has its own theme).

### A3. Request-placement on collections (already partially exists)

The collection detail page already routes to `/venue-portal/placements?artist=...&works=...&prefillMessage=...` (lines 285–321). Two improvements:

- Add `&arrangement=` query param so the user's choice on the collection (`revenue_share` or `free_loan`/"Paid Loan") preselects on the venue placement form. Today the form opens with no arrangement prefilled.
- Replace the inline routing with the shared `<PlacementButton />` component (`src/components/PlacementCTA.tsx`) extended to accept multi-work + arrangement props. Avoids logic duplication and keeps non-authed-user signup-redirect behaviour consistent.
- Add the same `<PlacementButton />` to the `/browse?view=collections` grid card so the request-placement entry doesn't depend on the user opening the detail page first.

`PlacementButton` props extension:

```ts
type PlacementButtonProps = {
  artistSlug: string;
  artistName: string;
  workTitles?: string[];        // multi-work (collection)
  arrangement?: "revenue_share" | "free_loan" | "purchase";
  prefillMessage?: string;
};
```

### A4. Mobile layout fix on collections page

The current collection detail page is single-column and stacked, which is fine, but the filter panel addition (A2) and the polish around the works-grid spacing need a coherent mobile pass:

- 1-column works grid on `<sm`, 2-column on `≥sm`, 3-column on `≥lg` (matches `/browse` works grid).
- Sticky filter button on mobile (top-right, just below the banner, not pinned to viewport — pinned feels noisy on long scroll).
- Banner image: cap height at `60vh` on mobile (currently uncropped, can dominate the fold).
- Sidebar (price + arrangement chips + buy-collection CTA) collapses below the works grid on `<lg` instead of stacking awkwardly.

### A5. Collections grid view in /browse

The collection cards on `/browse?view=collections` use `CollectionCard.tsx`. Current state: hover lift + image scale, but no overlay info. Match the new card-overlay pattern from Workstream B (title/work-count/price/Request-placement) so the cards behave consistently with the new portfolio/works cards.

---

## Workstream B — Card reveal behaviour (hover web, tap mobile)

Covers items **4 (mobile tap)**, **5 (web hover)**, **7 (size filter labelling)**.

### B1. New `ArtworkCard` wrapper

`ArtworkThumb.tsx` is a deliberately dumb image-frame component (its own header comment warns visualizer surfaces must keep using it raw). We add a wrapper, not modify it.

- New file `src/components/ArtworkCard.tsx`. Renders ArtworkThumb plus the new info overlay.
- Props:

```ts
type ArtworkCardProps = {
  src: string;
  alt: string;
  title: string;
  priceLabel: string;       // already-formatted, e.g. "£1,200" or "From £180"
  medium: string;
  href: string;             // full artwork detail URL
  onQuickView: () => void;
  onBuyNow: () => void;
  placedAtVenue?: string;   // populated from C1's denormalised field
  sizes?: string;
  priority?: boolean;
};
```

- Web (hover, `md+`): overlay fades in over the image with a 200 ms ease-in opacity transition and a 4 px upward translate on the action row. Pointer-events on overlay. The image stays visible (overlay is semi-transparent dark gradient at the bottom 50% of the card).
- Mobile (`<md`): tap-to-reveal. First tap reveals the overlay; second tap on the image triggers `Open` (matches the user mental model "I tapped the picture twice, take me there"); taps on individual buttons short-circuit to that action. The reveal is sticky for 6 s, then auto-hides if no further interaction (long enough to read, short enough not to feel persistent).
- "Placed at [Venue]" row appears between Medium and the action row, only when populated. Small chip styling (`text-[11px] text-muted bg-foreground/5 rounded-full px-2 py-0.5`).
- Action row: `Quick view` opens an in-page modal (lightweight — image + title + medium + price + Buy now); `Open` is a `<Link>` to the artwork detail; `Buy now` adds-to-cart-and-routes-to-`/checkout`.

### B2. Replace consumers in browse / portfolio / collection surfaces

Three consumers swap the inline ArtworkThumb usage for the new ArtworkCard:

- `/browse/page.tsx` works grid (the gallery view).
- `/browse/[slug]/ArtistProfileClient.tsx` (artist portfolio).
- `/browse/collections/[collectionId]/page.tsx` works grid (currently inlined; will use the new component).

ArtworkThumb itself stays untouched and continues to back the visualizer/canvas/3D scene/labels paths per its file header.

### B3. Size filter labelling

`/browse/page.tsx:22-52` defines the `bandForCm()` ranges: `small ≤30 · medium 30-60 · large 60-100 · xl >100` (cm, longest edge).

In FilterPanel (workstream A1), render each size button as a two-column row:

```
┌────────────┬────────────┐
│ Small      │ ≤ 30 cm    │
│ Medium     │ 30–60 cm   │
│ Large      │ 60–100 cm  │
│ XL         │ > 100 cm   │
└────────────┴────────────┘
```

Display strings live in a single `SIZE_BANDS` const exported from FilterPanel so the rendered labels and the filter logic share one source. Use en dash (`–`) for the range, not hyphen.

---

## Workstream C — Placement ↔ inventory ↔ revenue integrity

Covers items **6 (revenue→placement on delivery)**, **13 (stock decrement + "placed at venue")**, **17 (consistency review)**.

### C1. Database migration

New file: `supabase/migrations/<next_seq>_placement_inventory_attribution.sql` (sequence number based on existing migrations folder; will be `015` or higher).

```sql
ALTER TABLE artist_works
  ADD COLUMN IF NOT EXISTS placed_at_venue TEXT,
  ADD COLUMN IF NOT EXISTS current_placement_id TEXT;

CREATE INDEX IF NOT EXISTS idx_artist_works_current_placement
  ON artist_works(current_placement_id)
  WHERE current_placement_id IS NOT NULL;

ALTER TABLE placements
  ADD COLUMN IF NOT EXISTS delivery_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_placement_delivered
  ON orders(placement_id)
  WHERE placement_id IS NOT NULL AND status = 'delivered';
```

`placed_at_venue` is denormalised display-name (read-cheap; venue rename is rare and a re-run script can fix). `current_placement_id` is a soft FK (text, no enforced FK constraint to match the existing schema style with text PKs); used for "is this work currently placed?" lookups without joining placements.

### C2. Stock decrement + status update on placement acceptance

`src/app/api/placements/[id]/route.ts` PATCH handler. When the status transitions to `active`:

1. Read the placement row including `work_id` (the linked artwork) and the venue's `name` (lookup `venue_profiles` by `venue_user_id`).
2. Idempotency: skip if `placements.status_history` already shows a prior `active` transition (re-acceptance is a no-op, not a double-decrement).
3. If `work_id` present:
   - `SELECT quantity_available FROM artist_works WHERE id=$work_id`.
   - If non-null and `> 0`: `UPDATE artist_works SET quantity_available = quantity_available - 1, available = (quantity_available - 1) > 0 WHERE id=$work_id`.
   - Set `placed_at_venue = $venue.name`, `current_placement_id = $placement.id` regardless of finite/unlimited stock.

When the status transitions away from `active` to a terminal state (`ended`, `collected`, `declined-after-active`):

- `UPDATE artist_works SET placed_at_venue = NULL, current_placement_id = NULL WHERE id=$work_id` (only when `current_placement_id = $placement.id`, to avoid unsetting a different active placement on the same work).
- Restore stock: `quantity_available = quantity_available + 1, available = true` (idempotent guard: only if the inverse transition was previously recorded).

### C3. Revenue attribution on order delivery

`src/app/api/orders/route.ts` PATCH handler, after the existing status update succeeds (around line 141). When status transitions to `delivered` AND `order.placement_id` is set:

```ts
if (status === "delivered" && existingOrder.placement_id && existingOrder.venue_revenue) {
  // Idempotency: only attribute if status_history doesn't already record delivered
  const alreadyAttributed = (existingOrder.status_history || []).some(h => h.status === "delivered");
  if (!alreadyAttributed) {
    await db.rpc("increment_placement_revenue", {
      p_placement_id: existingOrder.placement_id,
      p_amount: existingOrder.venue_revenue,
    });
  }
}
```

`increment_placement_revenue` is a small Postgres function (in the same migration file) that does the atomic update — `revenue = revenue + amount, delivery_count = delivery_count + 1`. This avoids a read-modify-write race if two webhooks fire near-simultaneously.

The pre-update SELECT in `route.ts` is widened to also fetch `placement_id` and `venue_revenue` (currently only fetches `artist_user_id, artist_slug, buyer_email, buyer_user_id, shipping, status_history`).

### C4. "Placed at [Venue]" surface

- ArtworkCard overlay (workstream B1) reads `placedAtVenue` prop and renders the chip. Data source: the work's `placed_at_venue` column.
- Public artwork page `src/app/(pages)/browse/[slug]/[workSlug]/ArtworkPageClient.tsx`: small chip near the title showing "Currently placed at [venue name]". Hidden when null. Anchored next to the existing artist/medium metadata block.

### C5. Venue analytics surfacing placement revenue

`src/app/api/analytics/venue/route.ts`: add a new query that joins delivered orders to placements:

```sql
SELECT
  p.id as placement_id,
  p.artist_slug,
  p.work_id,
  p.delivery_count,
  COALESCE(SUM(o.venue_revenue), 0) as attributed_revenue
FROM placements p
LEFT JOIN orders o
  ON o.placement_id = p.id AND o.status = 'delivered'
WHERE p.venue_slug = $venue_slug
GROUP BY p.id;
```

Surface as a `placementRevenue` field in the analytics response. Existing impression/scan stats unchanged.

---

## Workstream D — Checkout correctness

Covers items **12 (shipping mismatch)**, **14 (guest checkout after QR scan)**.

### D1. Shared shipping calculator helper

The £80.49 vs £79.94 mismatch is structural:

- Display (`(pages)/checkout/page.tsx:33-94`) groups items by artist, takes largest-piece full rate plus 50 % per additional piece, uses `resolveShippingCost` (postcode + dimensions + framed + tier-based estimate), rounds at line 93.
- API (`/api/checkout/route.ts:38-41`) does flat `(item.shippingPrice ?? 9.95) * item.quantity` summed across all items, no consolidation, no postcode awareness.

Fix:

- New file `src/lib/shipping-checkout.ts` exporting a single function:

```ts
export function calculateOrderShipping(
  items: CartItem[],
  region: "uk" | "international",
): {
  artistGroups: Array<{
    artistSlug: string;
    artistName: string;
    items: CartItem[];
    shipping: number;
    needsSignature: boolean;
    longestTierLabel: string | null;
    estimatedDays: string | null;
    anyEstimated: boolean;
  }>;
  totalShipping: number;
};
```

- Move the per-artist consolidation logic from `(pages)/checkout/page.tsx:33-94` into this helper verbatim.
- Replace the inline calc on the display page with a call to the helper.
- Replace the broken flat fallback in `/api/checkout/route.ts:38-41` with the same helper. The API now creates Stripe line items with the per-artist shipping figures.
- Keep shipping as a single line item on the Stripe session for now (matches current invoice format), but use the helper-computed `totalShipping` as `unit_amount`. (Splitting per-artist on Stripe is a follow-up — out of scope.)

Net result: display total === API-computed shipping === Stripe line-item total === customer card charge.

### D2. Defensive expected-total check

The frontend POSTs `expectedShippingCost` and `expectedSubtotal` to `/api/checkout` alongside the cart. The API recomputes via the helper and compares. If they diverge by more than 1 p, log a warning to Sentry/console (do not block — the API's value wins, and any divergence is a code/data drift signal worth chasing separately).

### D3. Guest checkout from QR scan

API already supports it (no auth required, `customer_email: shipping.email` is the only identifier; webhook accepts `buyer_user_id NULL` orders; `/api/orders/track` does email-based public lookup).

The block must be in the front-end. Two places to audit and fix:

- `src/app/(pages)/browse/[slug]/[workSlug]/ArtworkPageClient.tsx` Buy Now button: any `if (!user)` redirect to /login. Replace with: add to cart, then navigate to /checkout (which already handles unauthenticated users via the email field).
- `src/context/CartContext.tsx`: any auth requirement to `addItem`. Should be a no-op.
- `(pages)/checkout/page.tsx`: confirm the email field is the only auth requirement (already true based on read).

QR-scan landing improvement: when arriving from `/api/qr/[slug]?ref=qr` and proceeding to checkout, auto-prefill the shipping email field if a `?email=` query param is present (e.g. from a logged-out user who has been seeded). Otherwise leave blank.

---

## Workstream E — Email layer fidelity

Covers items **9 (artwork images in emails)**, **10 (artist names not IDs)**, **16 (overall email review)**.

### E1. Render artwork images in customer order emails

Three templates currently don't render images:

- `src/emails/templates/orders/CustomerOrderReceipt.tsx`
- `src/emails/templates/orders/CustomerShippingConfirmation.tsx`
- `src/emails/templates/orders/CustomerDeliveryConfirmation.tsx`

The shared `OrderSummary` component (`src/emails/_components/OrderSummary.tsx:39`) already renders `<Img src={item.image}>`. Two scenarios to handle:

1. The template doesn't use `OrderSummary` at all: drop it in.
2. The template uses `OrderSummary` but `item.image` is missing in the props: trace back to the construction site (Stripe webhook for receipt; order PATCH handler for shipping/delivery confirmations) and ensure the image URL is in the cart metadata or the order row.

The webhook already pulls cart items from `session.metadata.cart_items` (truncated to 500 chars at line 83 of `api/checkout/route.ts`). Image URLs may exceed that — either:

- Switch from metadata to a server-side cart snapshot keyed by `payment_intent_id`, OR
- Persist `items.image` on the `orders.items` JSONB column (the canonical post-write source).

We go with the latter — the `orders.items` JSONB already stores the cart shape; the webhook can pull image from there for shipping/delivery emails (which fire after the order row exists), and the receipt email reads it the same way.

### E2. Resolve artist display names in emails

`src/app/api/webhooks/stripe/route.ts:287` and the equivalent line in any other email-prop construction:

```ts
artistName: item.artistName || firstArtistSlug || "Artist"
```

Replace with a slug-based lookup. New helper `src/emails/_helpers/resolve-artist-name.ts`:

```ts
export async function resolveArtistName(
  db: SupabaseClient,
  slug: string | null | undefined,
  fallback?: string | null,
): Promise<string> {
  if (!slug) return fallback?.trim() || "Artist";
  // Lookup by slug
  const { data } = await db
    .from("artist_profiles")
    .select("name")
    .eq("slug", slug)
    .single();
  return data?.name?.trim() || fallback?.trim() || slug;
}
```

In webhook callers, batch-resolve all unique artist slugs once per email-build (avoid N round-trips). Cache in a `Map<slug, name>` for the webhook handler scope.

`ArtistWorkSold` already does this correctly (per the email explorer's read) — copy its pattern.

### E3. Em-dash sweep in emails

User-facing strings only. Targets:

- All `.tsx` files under `src/emails/templates/`.
- `src/emails/_components/` shared layout text.
- `src/emails/data/mockData.ts` — mock data is used by the email-preview page; keep it readable.

Replacement table:

| Pattern | Replacement |
|---------|-------------|
| `X — Y` (prose pause) | `X. Y` or `X: Y` or `X, Y` (use the one that flows; default to period+space) |
| `X — Y — Z` (parenthetical) | `X (Y) Z` or `X. Y. Z` |
| `5–10 days` (range) | `5–10 days` (already en dash; don't touch) |
| `5—10 days` (range with em dash) | `5–10 days` (en dash) |
| `--` literal | strip / replace with appropriate punctuation |

Code comments and JSDoc strings: untouched.

### E4. Email preview QA

`src/app/email-preview/page.tsx` lists all 113 templates. Use it as the verification surface for E1–E3. Render each affected template and visually confirm: image present, artist name human, no stray em-dashes.

---

## Workstream F — Polish + isolated bugs

Covers items **2 (QR label deselect)**, **3 (image-save protection)**, **11 (em-dash sweep site-wide)**, **18 (final QA)**.

### F1. QR label preview deselection bug

Root cause (verified): `LabelPreview.tsx:161-187` uses the data field itself as the toggle's "on" state, restoring the data from `_sourceX` source-fields when toggling on. If `_sourceX` was never populated for a given label (which happens when the upstream `previewLabels` constructor in `artist-portal/labels/page.tsx` was running with that field's global `options.show*` flag set to `false`), the toggle can be turned off but never back on, and visually appears stuck.

Fix:

- Refactor `LabelPreview` to maintain a **separate per-label visibility state**, decoupled from the data fields:

```ts
const [labelVisibility, setLabelVisibility] = useState<Array<{ medium: boolean; dimensions: boolean; price: boolean }>>(
  () => initialLabels.map(l => ({
    medium: !!l.workMedium,
    dimensions: !!l.workDimensions,
    price: !!l.workPrice,
  }))
);
```

- Toggle now flips the visibility flag, not the data field. The data field stays populated from the source.
- `LabelSheet`/`QRLabel` receive both the data and the visibility flags; render conditionally on the flag.

- Audit upstream: `src/app/(pages)/artist-portal/labels/page.tsx` and `venue-portal/labels/page.tsx`. The `previewLabels` constructor must always populate `workMedium/workDimensions/workPrice` with the work's actual data (not gated on global `options`), so the user can re-enable a field that started off in the preview. The global `options` toggles control only the *initial* visibility.

### F2. Expanded artwork image-save protection

`src/components/ArtworkImageViewer.tsx` already has solid protection on the inline view (lines 42-66): `select-none`, `onContextMenu={preventDefault}`, `pointer-events-none` on Image, `draggable={false}`, plus a transparent overlay at line 66.

The fullscreen branch (lines 127-174) is missing the overlay. Add:

- Transparent absolute-positioned div over the fullscreen `<Image>` to defeat long-press save on iOS Safari.
- Inline style `WebkitTouchCallout: 'none', WebkitUserDrag: 'none', userSelect: 'none'` on the Image element.
- Same hardening pattern applied to:
  - `BrowseArtistCard.tsx` carousel images (already partially protected; align to the same set of properties).
  - The new `ArtworkCard` from workstream B (build it in from the start).
- Add a small CSS rule in `src/app/globals.css` for any `<img data-protected="artwork">` to enforce the WebKit properties globally.

Caveat documented in code comment: nothing stops a screenshot. Goal is right-click and long-press.

### F3. Em-dash sweep site-wide

Sites:

- `src/app/(pages)/**/*.tsx`
- `src/components/**/*.tsx`
- `src/data/**/*.ts`
- `src/emails/` (covered separately in E3 but include in the sweep for completeness)

Strategy:

1. `grep -rn "—" src/` to enumerate.
2. For each hit, decide: in JSX text or string literal (user-facing) → replace; in comments / JSDoc → leave.
3. Apply the same replacement table as E3.
4. After the sweep, re-grep to confirm zero user-facing em-dashes remain (allow a deny-list for code-comment hits).

The `AGENTS.md` file at `website/AGENTS.md` itself has an em-dash; replace it. The repo's commit messages historically use em-dashes too — those are immutable so untouched.

### F4. Final QA pass

Before closing the branch:

- `npm run check` (lint + typecheck + vitest). Must pass.
- `npm run test:e2e` (Playwright) — opportunistic; if config requires a running dev server and external services, skip and document in the handover.
- `npm run dev` and walk the affected surfaces manually:
  1. `/browse` — works, portfolios, collections views; filter panel toggles correctly; mobile filter drawer.
  2. `/browse/collections/[id]` — filter panel present; request-placement button works; mobile layout coherent.
  3. `/browse/[slug]` — artist portfolio; tap an artwork on mobile, hover on web; verify the overlay shows name/price/medium/quick-view/open/buy-now; placed-at-venue chip when applicable.
  4. Single artwork page — image expand; right-click and long-press blocked; Buy Now adds to cart and routes to checkout for guest.
  5. Add-to-cart → checkout — shipping total displayed matches Stripe checkout total exactly.
  6. QR scan flow — scan → land → buy as guest → checkout.
  7. QR label preview — select multiple labels, on the SECOND label toggle medium / dimensions / price off then back on; verify both directions work.
  8. `/email-preview/[id]` — open `CustomerOrderReceipt`, `CustomerShippingConfirmation`, `CustomerDeliveryConfirmation`; verify artwork image renders and artist name is human.

Regression watch: the recent `(pages)/browse/page.tsx` 913-line change touched a lot of filter logic. Re-running snapshot/unit tests on that file after extraction is critical.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| FilterPanel extraction breaks browse filtering for /browse users | Snapshot tests before/after; behavioural diff on the same fixture data. |
| Placement-acceptance stock decrement fires twice on idempotent re-acceptance | Status-history check before mutating. |
| Revenue attribution on delivery races with refund webhook | Use the Postgres function for atomic update; status_history idempotency check. |
| Shipping helper rounding differs from Stripe rounding | Round once at the point we hand to Stripe (`Math.round(x * 100)`). Display uses the same rounded value. |
| Email artist-name lookup adds latency to webhook | Batch-resolve unique slugs; cache per-webhook scope. Webhook is async and time-tolerant. |
| Stash re-apply at the end conflicts on `webhooks/stripe/route.ts` and `orders/route.ts` | User has confirmed manual reconcile. The stash is preserved as `stash@{0}`. Reconciliation is a deliberate per-file pass at the end of the batch. |

## Sequencing

A → B → C (DB migration + backend) → D (front+back) → E (emails) → F (polish + QA + sweep).

Workstream B depends on A's FilterPanel extraction (size filter labelling lives in FilterPanel). Workstream C's "Placed at [Venue]" overlay depends on B's ArtworkCard. D and E are independent of A/B/C and can be reordered if a parallel pair of hands shows up. F closes the loop and runs the regression sweep.

## Out of scope (explicitly)

- Resend DNS / domain verification (`src/emails/OUTSTANDING.md` §1.1) — infra task, not code.
- New galleries detail page — galleries currently redirect to `/browse?view=gallery`; intentional.
- Backwards-compat shims for the placement enum — UI labels already remap; no rename needed.
- Splitting Stripe shipping line items per-artist (D1 keeps a single line for now).
- The 27 stashed files of unrelated WIP — reconciled at the end, not folded into this batch.
