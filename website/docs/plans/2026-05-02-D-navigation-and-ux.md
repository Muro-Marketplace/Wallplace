# Plan D — Navigation & UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the §3 (UX & navigation) and §6 (missing journeys) buckets from the 2026-04-30 pre-launch QA audit. Stop the marketplace feeling unfinished — breadcrumbs everywhere they're missing, real empty states, no dead-end flows, no fake choices in the header for roles that don't exist.

**Architecture:** Two new shared components — `<Breadcrumbs>` and `<EmptyState>` — get adopted across the affected pages. Toast messages added at the three places redirects happen silently (login, PortalGuard, OAuth-flag-off). One new public page — `/venues` landing — mirrors `/artists`. Otherwise it's small, surgical edits.

**Tech Stack:** Next.js 16.2, React 19.2, Vitest 2.1. Tests colocated `*.test.ts(x)` siblings. Path alias `@/` → `src/`.

**Independence:**
- **Plan A** (auth/security) is the parent. Plan D extends Plan A's `RedirectIfLoggedIn` and login-page changes with user-facing toasts. If Plan A hasn't merged, Tasks 5 and 17 in Plan D either depend on Plan A or stand on their own — flagged where it matters.
- **Plan B** (checkout / payments) overlaps Plan D Task 8 (per-artist fulfilment text) and Task 9 (carrier tracking links). Plan D ships these as plain UX strings; Plan B can replace with smarter logic later.
- **Plan C** (portal data correctness) overlaps Plan D Task 11 (stale prices for removed works) — that scope was originally Plan C's, but Plan D applies it because it's a UX-correctness piece, not a data-correctness piece. If both plans land, the change happens once.

**Out of scope (other plans):**
- Auth gates / signup verification (Plan A)
- Stripe Connect pre-flight, country dropdown (Plan B)
- Account deletion API, notification prefs persistence, paid_loan migration (Plan C)
- Mobile-only layout fixes — z-index, tap targets, focus styles (Plan E)
- Toast UX framework, image fallbacks, currency edge cases (Plan F)

**Branch strategy:**
- Worktree: `git worktree add .claude/worktrees/qa-d-navigation-ux claude/qa-d-navigation-ux` off `main`.
- One commit per task. Push after Phase 2 (so quick wins land early).
- `npm run check` MUST pass before each commit.

**Phases:**
1. Foundation components (Tasks 1–3) — `<Breadcrumbs>`, `<EmptyState>`, toast plumbing
2. Apply foundations (Tasks 4–7) — breadcrumbs on detail pages, empty states across portal lists, redirect toasts
3. Counter-offer dialog UX (Task 8) — 50% hint, note limit, error boundary
4. Order / checkout polish (Tasks 9–11) — carrier link, per-artist fulfilment, stale-price guard
5. Placement detail back-nav (Task 12) — sticky breadcrumb + back link
6. Header / footer / nav (Tasks 13–16) — footer links, notifications dropdown cleanup, logged-out venue tabs, portal switcher
7. Missing pages (Tasks 17–20) — `/venues` landing, empty Showroom CTA, OAuth flag-off message, dev routes gated
8. Final verification + PR (Task 21)

---

## Phase 1 — Foundation components

### Task 1: `<Breadcrumbs>` component + tests

**Files:**
- Create: `src/components/Breadcrumbs.tsx`
- Test: `src/components/Breadcrumbs.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Breadcrumbs.test.tsx
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Breadcrumbs from "./Breadcrumbs";

describe("<Breadcrumbs />", () => {
  it("renders nothing when given no items", () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders the current item as a non-link", () => {
    const { getByText, queryByRole } = render(
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Galleries" }]} />,
    );
    expect(getByText("Galleries").tagName).toBe("SPAN");
    expect(queryByRole("link", { name: "Galleries" })).toBeNull();
  });

  it("renders intermediate items as links", () => {
    const { getByRole } = render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Browse", href: "/browse" },
          { label: "Untitled" },
        ]}
      />,
    );
    expect(getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(getByRole("link", { name: "Browse" }).getAttribute("href")).toBe("/browse");
  });

  it("uses aria-label on the nav for screen readers", () => {
    const { getByLabelText } = render(
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "X" }]} />,
    );
    expect(getByLabelText("Breadcrumb")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/components/Breadcrumbs.test.tsx`. Expected: module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/Breadcrumbs.tsx
"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  /** Display text. Required. */
  label: string;
  /** If omitted, the item is rendered as plain text (current page). */
  href?: string;
}

/**
 * Lightweight breadcrumb trail. Hides itself when items is empty so
 * pages can pass a derived list without a wrapping conditional.
 *
 * Convention: the LAST item is the current page (no href). Earlier
 * items are links back up the hierarchy.
 */
export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted mb-3">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${it.label}-${idx}`} className="flex items-center gap-1.5">
              {it.href && !isLast ? (
                <Link
                  href={it.href}
                  className="hover:text-foreground transition-colors"
                >
                  {it.label}
                </Link>
              ) : (
                <span className={isLast ? "text-foreground" : ""}>{it.label}</span>
              )}
              {!isLast && <span aria-hidden>›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 4: Verify PASS**

Run: `npx vitest run src/components/Breadcrumbs.test.tsx`. Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Breadcrumbs.tsx src/components/Breadcrumbs.test.tsx
git commit -m "feat(ui): add Breadcrumbs component"
```

---

### Task 2: `<EmptyState>` component + tests

**Files:**
- Create: `src/components/EmptyState.tsx`
- Test: `src/components/EmptyState.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// src/components/EmptyState.test.tsx
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import EmptyState from "./EmptyState";

describe("<EmptyState />", () => {
  it("renders title and hint", () => {
    const { getByText } = render(
      <EmptyState title="No orders yet" hint="Browse art to place your first order." />,
    );
    expect(getByText("No orders yet")).toBeTruthy();
    expect(getByText("Browse art to place your first order.")).toBeTruthy();
  });

  it("renders the CTA when provided as a link", () => {
    const { getByRole } = render(
      <EmptyState title="t" hint="h" cta={{ label: "Browse", href: "/browse" }} />,
    );
    const link = getByRole("link", { name: "Browse" });
    expect(link.getAttribute("href")).toBe("/browse");
  });

  it("omits the CTA section when cta is undefined", () => {
    const { queryByRole } = render(<EmptyState title="t" hint="h" />);
    expect(queryByRole("link")).toBeNull();
  });
});
```

- [ ] **Step 2: Verify FAIL**

`npx vitest run src/components/EmptyState.test.tsx` → module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/EmptyState.tsx
import Link from "next/link";

export interface EmptyStateProps {
  /** One-line summary, e.g. "No orders yet". */
  title: string;
  /** Sentence explaining why and what to do next. */
  hint: string;
  /** Optional next-step button. */
  cta?: { label: string; href: string };
  /** Optional small icon slot, rendered above the title. */
  icon?: React.ReactNode;
}

/**
 * Standardised empty state for list views. Always pairs an explanation
 * with a clear next action. Don't use for "loading" — use a skeleton.
 */
export default function EmptyState({ title, hint, cta, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6">
      {icon && <div className="text-muted/50 mb-3 flex justify-center">{icon}</div>}
      <h3 className="text-base font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto mb-6">{hint}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-block px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-sm hover:bg-accent-hover transition-colors"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify PASS**

`npx vitest run src/components/EmptyState.test.tsx` → 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/EmptyState.tsx src/components/EmptyState.test.tsx
git commit -m "feat(ui): add EmptyState component"
```

---

### Task 3: Toast plumbing (extend existing ToastContext if missing helpers)

**Files:**
- Modify: `src/context/ToastContext.tsx` (if needed)

- [ ] **Step 1: Read ToastContext**

Run: `grep -n "showToast\|toast\|export" src/context/ToastContext.tsx | head -30`

The QA report flagged the existing ToastContext is hardcoded to a 3 s duration and bottom-right. We only need three small extensions for Plan D: support an optional `duration` argument, support a `variant: "info" | "warn" | "error"`, and surface a hook `useToast()` if not already exported. If the existing API already has these, skip the modification and move on.

- [ ] **Step 2: If extension is needed, write a test for the new behaviour**

```tsx
// src/context/ToastContext.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastContext";

function Trigger() {
  const { showToast } = useToast();
  return (
    <button
      onClick={() => showToast("Heads up", { variant: "warn", durationMs: 5000 })}
    >
      fire
    </button>
  );
}

describe("ToastContext extensions", () => {
  it("respects custom duration", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("fire").click());
    expect(screen.getByText("Heads up")).toBeTruthy();
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.queryByText("Heads up")).not.toBeNull();
    act(() => vi.advanceTimersByTime(2));
    expect(screen.queryByText("Heads up")).toBeNull();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 3: Extend ToastContext**

If `showToast` only accepts a string, widen the signature:

```tsx
type ToastOptions = { variant?: "info" | "warn" | "error"; durationMs?: number };

interface ToastContextValue {
  showToast: (message: string, opts?: ToastOptions) => void;
}
```

In the provider, default `durationMs` to 3000 and use it for `setTimeout`. Apply variant to the toast styling (existing accent colour for "info", amber-50 for "warn", red-50 for "error"). Keep backwards-compat — existing single-arg calls keep working.

- [ ] **Step 4: Verify**

`npm run typecheck && npx vitest run src/context/ToastContext.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/context/ToastContext.tsx src/context/ToastContext.test.tsx
git commit -m "feat(ui): toast supports duration + variant for redirect messages"
```

If no changes were needed in Step 1, skip the commit and move on. Note "ToastContext already supports the API" in the PR body.

---

## Phase 2 — Apply foundations

### Task 4: Add breadcrumbs to detail pages

**Files:**
- Modify: `src/app/(pages)/browse/[slug]/page.tsx` (artist profile)
- Modify: `src/app/(pages)/browse/[slug]/[workSlug]/page.tsx` (artwork detail)
- Modify: `src/app/(pages)/browse/collections/[collectionId]/page.tsx` (collection)
- Modify: `src/app/(pages)/venues/[slug]/page.tsx` (venue detail)

- [ ] **Step 1: Add Breadcrumbs to each page**

Pattern for each — add the import, render at the top of the main content (above the hero / title):

```tsx
import Breadcrumbs from "@/components/Breadcrumbs";

// inside the page body, just below the layout wrapper:
<Breadcrumbs
  items={[
    { label: "Galleries", href: "/browse" },
    { label: artistName, href: `/browse/${artistSlug}` },
    { label: workTitle }, // current page, no href
  ]}
/>
```

Per-page items:
- **Artist profile** `/browse/[slug]`: `[{ label: "Portfolios", href: "/browse?view=portfolios" }, { label: artistName }]`
- **Artwork detail** `/browse/[slug]/[workSlug]`: `[{ label: "Galleries", href: "/browse" }, { label: artistName, href: ${'`'}/browse/${slug}${'`'} }, { label: workTitle }]`
- **Collection detail**: `[{ label: "Collections", href: "/browse?view=collections" }, { label: collectionTitle }]`
- **Venue detail**: `[{ label: "Spaces", href: "/spaces-looking-for-art" }, { label: venueName }]`

For server components (`browse/[slug]/page.tsx` likely is one), the component is a client component but the data props are server-fetched — `<Breadcrumbs>` is `"use client"` so that's fine to render inside.

- [ ] **Step 2: Smoke**

Open each detail page. Confirm breadcrumb shows above the hero, intermediate items are clickable, current page is plain text, browser back button still works.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(pages)/browse/[slug]/page.tsx" \
        "src/app/(pages)/browse/[slug]/[workSlug]/page.tsx" \
        "src/app/(pages)/browse/collections/[collectionId]/page.tsx" \
        "src/app/(pages)/venues/[slug]/page.tsx"
git commit -m "feat(nav): breadcrumbs on artwork, artist, collection, venue detail pages"
```

---

### Task 5: Apply EmptyState to portal list views

**Files:**
- Modify: `src/app/(pages)/customer-portal/page.tsx` (orders empty)
- Modify: `src/app/(pages)/customer-portal/saved/page.tsx`
- Modify: `src/app/(pages)/artist-portal/saved/page.tsx`
- Modify: `src/app/(pages)/venue-portal/saved/page.tsx`
- Modify: `src/app/(pages)/venue-portal/walls/page.tsx` (no walls)
- Modify: `src/app/(pages)/artist-portal/portfolio/page.tsx` (no works)
- Modify: `src/app/(pages)/artist-portal/orders/page.tsx`
- Modify: `src/app/(pages)/venue-portal/orders/page.tsx`

- [ ] **Step 1: For each page, find the existing "no rows" branch**

Each list view has a conditional `if (items.length === 0)` (or similar). Replace whatever's there with `<EmptyState>`.

- [ ] **Step 2: Replace**

Pattern (customer orders example):

```tsx
import EmptyState from "@/components/EmptyState";

// In the render branch:
if (orders.length === 0) {
  return (
    <EmptyState
      title="No orders yet"
      hint="Browse the marketplace to place your first order."
      cta={{ label: "Discover art", href: "/browse" }}
    />
  );
}
```

Per-page CTAs:
- Customer dashboard / artist orders / venue orders → CTA "Discover art" → `/browse`
- Saved (any portal): tab-aware
  - Works tab empty → CTA "Browse galleries" → `/browse`
  - Artists tab empty → CTA "Browse portfolios" → `/browse?view=portfolios`
  - Collections tab empty → CTA "Browse collections" → `/browse?view=collections`
- Venue walls empty → CTA "Add your first wall" → `/venue-portal/walls/new`
- Artist portfolio empty → CTA "Add your first work" → wherever the upload flow lives (look at the Add button on the portfolio page; probably opens a modal — in that case, EmptyState's CTA is a button, not a Link; pass a small variant prop OR keep a plain `<button>` markup matching EmptyState's styling)

- [ ] **Step 3: Smoke**

Sign in as a fresh user with zero rows in each list. Each empty list shows the standardised state with a clear next action.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(pages)/customer-portal/page.tsx" \
        "src/app/(pages)/customer-portal/saved/page.tsx" \
        "src/app/(pages)/artist-portal/saved/page.tsx" \
        "src/app/(pages)/venue-portal/saved/page.tsx" \
        "src/app/(pages)/venue-portal/walls/page.tsx" \
        "src/app/(pages)/artist-portal/portfolio/page.tsx" \
        "src/app/(pages)/artist-portal/orders/page.tsx" \
        "src/app/(pages)/venue-portal/orders/page.tsx"
git commit -m "feat(portal): standardised empty states with explicit next-step CTAs"
```

---

### Task 6: PortalGuard toast on role redirect

**Files:**
- Modify: `src/components/PortalGuard.tsx`

PortalGuard already redirects wrong-role users silently. Add a toast so they know why.

- [ ] **Step 1: Find the wrong-role redirect**

In `src/components/PortalGuard.tsx`, the existing useEffect (around lines 22–32) redirects when `userType !== allowedType`. Add a toast call before the redirect.

- [ ] **Step 2: Modify**

Add the import:

```tsx
import { useToast } from "@/context/ToastContext";
```

Inside the component, near the existing hooks:

```tsx
const { showToast } = useToast();
```

Modify the wrong-role branch:

```tsx
useEffect(() => {
  if (loading || !user) {
    if (!loading && !user) router.replace("/login");
    return;
  }
  if (userType && userType !== allowedType) {
    showToast(
      `This is the ${allowedType} portal. Redirecting to your ${userType} portal.`,
      { variant: "info", durationMs: 4000 },
    );
    router.replace(
      userType === "admin" ? "/admin" :
      userType === "artist" ? "/artist-portal" :
      userType === "customer" ? "/customer-portal" :
      "/venue-portal"
    );
  }
}, [user, loading, userType, allowedType, router, showToast]);
```

(If Plan A's `portalPathForRole` helper is merged, use it instead of the inline ternary.)

- [ ] **Step 3: Test**

```tsx
// src/components/PortalGuard.test.tsx
// @vitest-environment jsdom
// (extends the test file Plan A added — add this case)
it("toasts before redirecting a wrong-role user", async () => {
  // ...mock setup as in Plan A's test
  // assertion: showToast called with "venue portal" / "artist portal" / etc.
});
```

If Plan A's PortalGuard test file already exists, append; otherwise create.

- [ ] **Step 4: Smoke**

Sign in as a customer. Navigate to `/artist-portal`. A toast appears reading "This is the artist portal. Redirecting to your customer portal." Then the redirect fires.

- [ ] **Step 5: Commit**

```bash
git add src/components/PortalGuard.tsx src/components/PortalGuard.test.tsx
git commit -m "fix(auth): PortalGuard surfaces a toast before role redirect"
```

---

### Task 7: Login page surfaces "you're already signed in" toast

**Files:**
- Modify: `src/app/(pages)/login/page.tsx`

Plan A's Task 5 made the login page honour `?next=`. This adds the user-facing message before the redirect.

- [ ] **Step 1: Modify**

Find the existing already-logged-in `useEffect` (Plan A's Task 5 left it at the top of the component). Add a one-shot toast using a ref to avoid double-firing:

```tsx
import { useToast } from "@/context/ToastContext";

const { showToast } = useToast();
const toastFired = useRef(false);

useEffect(() => {
  if (authLoading || !user) return;
  if (!toastFired.current) {
    toastFired.current = true;
    showToast("You're already signed in. Redirecting…", { durationMs: 2500 });
  }
  const next = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("next");
  router.replace(safeRedirect(next, portalPathForRole(userType)));
}, [authLoading, user, userType, router, showToast]);
```

- [ ] **Step 2: Smoke**

Sign in. Manually navigate to `/login`. Toast appears, then redirect to portal.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(pages)/login/page.tsx"
git commit -m "fix(auth): login surfaces 'already signed in' toast before redirect"
```

---

## Phase 3 — Counter-offer dialog UX

### Task 8: 50% hint + note char limit + textarea size + error boundary

**Files:**
- Modify: `src/components/CounterPlacementDialog.tsx`
- Test: `src/components/CounterPlacementDialog.test.tsx` (create or extend)

- [ ] **Step 1: Read the file to find the affected blocks**

Run: `grep -n "max=\\|rows=\\|note\\|revShare\\|window.dispatchEvent" src/components/CounterPlacementDialog.tsx`

QA found:
- §3.7 percent input has `max={50}` with no UX hint
- §3.8 note `<textarea rows={2}>` with no char limit
- §3.16 `window.dispatchEvent` has no error boundary

- [ ] **Step 2: Modify the percent block**

Find the rev-share `<input type="number">`. Add helper text below it:

```tsx
<input
  type="number"
  min={0}
  max={50}
  step={1}
  value={revShare}
  onChange={(e) => setRevShare(e.target.value === "" ? "" : Number(e.target.value))}
  className="w-full px-3 py-2 border border-border rounded-sm text-sm"
/>
<p className="text-[11px] text-muted mt-1">Max 50% to the venue.</p>
```

- [ ] **Step 3: Modify the note textarea**

```tsx
const NOTE_MAX = 600;
// ...
<textarea
  value={note}
  onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
  rows={4}
  maxLength={NOTE_MAX}
  className="w-full px-3 py-2 border border-border rounded-sm text-sm resize-y max-h-40"
  placeholder="Optional message"
/>
<p className="text-[11px] text-muted mt-1 text-right">
  {note.length} / {NOTE_MAX}
</p>
```

- [ ] **Step 4: Wrap the dispatchEvent in try/catch**

Around line 99–101 (the `window.dispatchEvent(new CustomEvent(...))`):

```tsx
if (typeof window !== "undefined") {
  try {
    window.dispatchEvent(new CustomEvent("wallplace:placement-changed", { detail: { ...result, action: "counter" } }));
  } catch (err) {
    // Listener errors must not stomp on the modal close — log and continue.
    console.warn("[counter-dialog] event listener error:", err);
  }
}
```

- [ ] **Step 5: Test**

Add a small test:

```tsx
// src/components/CounterPlacementDialog.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";

vi.mock("@/lib/api-client", () => ({
  authFetch: vi.fn(async () => ({ ok: true, json: async () => ({}) })),
}));

import CounterPlacementDialog from "./CounterPlacementDialog";

describe("<CounterPlacementDialog />", () => {
  it("caps note at 600 chars", () => {
    const { container } = render(
      <CounterPlacementDialog placementId="p1" onClose={() => {}} />,
    );
    const ta = container.querySelector("textarea")!;
    fireEvent.change(ta, { target: { value: "x".repeat(700) } });
    expect((ta as HTMLTextAreaElement).value.length).toBe(600);
  });

  it("shows the 'max 50% to the venue' helper", () => {
    const { getByText } = render(
      <CounterPlacementDialog placementId="p1" onClose={() => {}} />,
    );
    expect(getByText(/max 50% to the venue/i)).toBeTruthy();
  });
});
```

- [ ] **Step 6: Verify + commit**

```bash
npm run check && \
git add src/components/CounterPlacementDialog.tsx src/components/CounterPlacementDialog.test.tsx && \
git commit -m "fix(placements): counter dialog adds 50% hint, 600-char note, error boundary"
```

---

## Phase 4 — Order / checkout polish

### Task 9: Carrier tracking link on order rows

**Files:**
- Create: `src/lib/carrier-tracking.ts`
- Test: `src/lib/carrier-tracking.test.ts`
- Modify: `src/components/OrderStatusTracker.tsx`

QA report §3.11: order tracker shows the tracking number but not a clickable link to the carrier's tracking page.

- [ ] **Step 1: Failing test**

```ts
// src/lib/carrier-tracking.test.ts
import { describe, expect, it } from "vitest";
import { detectCarrierUrl } from "./carrier-tracking";

describe("detectCarrierUrl()", () => {
  it("returns null for empty / unknown formats", () => {
    expect(detectCarrierUrl("")).toBeNull();
    expect(detectCarrierUrl("ABCD1234")).toBeNull();
    expect(detectCarrierUrl(undefined)).toBeNull();
  });

  it("matches a Royal Mail tracking number (1Z, AB123456789GB, etc.)", () => {
    const url = detectCarrierUrl("AB123456789GB");
    expect(url).toContain("royalmail.com/track-your-item");
    expect(url).toContain("AB123456789GB");
  });

  it("matches a UPS 1Z…", () => {
    const url = detectCarrierUrl("1Z999AA10123456784");
    expect(url).toContain("ups.com/track");
  });

  it("matches a FedEx 12-digit number", () => {
    const url = detectCarrierUrl("123456789012");
    expect(url).toContain("fedex.com/fedextrack");
  });

  it("matches a DHL 10-digit number", () => {
    const url = detectCarrierUrl("1234567890");
    expect(url).toContain("dhl.com/en/express/tracking");
  });
});
```

- [ ] **Step 2: Verify FAIL**

`npx vitest run src/lib/carrier-tracking.test.ts` → module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/carrier-tracking.ts
//
// Best-effort carrier lookup from a UK-shipping-tracking number. Not
// perfect — same-format collisions exist between FedEx and DHL — but
// good enough for a "tap to track" link. Falls back to null when we
// can't identify the carrier; UI then falls back to plain text.

interface Pattern {
  test: RegExp;
  url: (n: string) => string;
}

const PATTERNS: Pattern[] = [
  // UPS: starts with 1Z plus 16 alphanumeric chars
  { test: /^1Z[A-Z0-9]{16}$/i, url: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}` },
  // Royal Mail: 2 letters, 9 digits, 2 letters (commonly ending in GB)
  { test: /^[A-Z]{2}\d{9}[A-Z]{2}$/, url: (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(n)}` },
  // FedEx: 12 digits (also matches some other carriers; FedEx is the most common in this format)
  { test: /^\d{12}$/, url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}` },
  // DHL Express: 10 digits
  { test: /^\d{10}$/, url: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(n)}` },
];

export function detectCarrierUrl(trackingNumber: string | null | undefined): string | null {
  if (typeof trackingNumber !== "string") return null;
  const trimmed = trackingNumber.trim();
  if (trimmed.length === 0) return null;
  for (const p of PATTERNS) {
    if (p.test.test(trimmed)) return p.url(trimmed);
  }
  return null;
}
```

- [ ] **Step 4: Wire into the order tracker**

Open `src/components/OrderStatusTracker.tsx`. Find where the tracking number is rendered. Wrap it in a conditional link:

```tsx
import { detectCarrierUrl } from "@/lib/carrier-tracking";

// inside the row that shows the tracking number:
{order.tracking_number && (() => {
  const url = detectCarrierUrl(order.tracking_number);
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
    >
      {order.tracking_number} ↗
    </a>
  ) : (
    <span className="text-foreground">{order.tracking_number}</span>
  );
})()}
```

- [ ] **Step 5: Verify + smoke + commit**

`npm run check`. Manually paste a fake tracking number into a test order; the row should render as a link.

```bash
git add src/lib/carrier-tracking.ts src/lib/carrier-tracking.test.ts \
        src/components/OrderStatusTracker.tsx
git commit -m "feat(orders): detect carrier from tracking number and render as link"
```

---

### Task 10: Per-artist fulfilment time on multi-artist checkout

**Files:**
- Modify: `src/app/(pages)/checkout/page.tsx`

QA §3.14: a multi-artist order shows artist groups but the fulfilment notice claims a single 7-day window for the whole order, which is misleading.

- [ ] **Step 1: Replace the single notice with per-group rows**

Find the existing single fulfilment notice block (in the read of the file from Plan A / Plan B context, around lines 269–278). Replace with a per-artist row inside each artist group block:

```tsx
{/* Inside the artistGroups iteration: */}
<div className="text-[11px] text-muted mt-2">
  {group.artistName} ships within {group.estimatedDays || "5-7"} working days.
</div>
```

Drop the bottom-of-page general notice. Keep the secure-payment block.

- [ ] **Step 2: Smoke**

Add 2+ items from different artists to the cart. Each artist group block in the order summary now has a fulfilment row referring to that artist.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(pages)/checkout/page.tsx"
git commit -m "fix(checkout): per-artist fulfilment time, not a single misleading notice"
```

---

### Task 11: Stale-price guard for works removed from portfolio

**Files:**
- Modify: `src/app/(pages)/artist-portal/collections/page.tsx`
- Modify: `src/app/(pages)/browse/collections/[collectionId]/page.tsx`

QA §3.10: when a work is deleted from an artist's portfolio, anywhere that references it via id-only (collections, public collection page) keeps showing the stale price/title or renders blank.

- [ ] **Step 1: Find the work-rendering branches**

In each file, find where `works.find(w => w.id === workIds[n])` (or similar) renders. The QA report points at `artist-portal/collections/page.tsx:352-365`.

- [ ] **Step 2: Add the missing-work fallback**

```tsx
// inside renderCollectionWork (or equivalent):
const work = workMap.get(workId);
if (!work) {
  return (
    <div className="text-xs text-muted italic py-2">
      Work removed from portfolio
    </div>
  );
}
// existing render of work...
```

For the public collection page: the user-facing copy should be neutral, not exposing internal state:

```tsx
if (!work) return null; // hide it entirely on public pages
```

- [ ] **Step 3: Smoke**

Create a collection containing two works. Delete one of the works from the portfolio. Reload the artist-portal collections page — the deleted work shows "Work removed from portfolio" inline. Visit the public collection page — the deleted work is silently hidden.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(pages)/artist-portal/collections/page.tsx" \
        "src/app/(pages)/browse/collections/[collectionId]/page.tsx"
git commit -m "fix(collections): guard against stale references to removed works"
```

---

## Phase 5 — Placement detail back-nav

### Task 12: Sticky breadcrumb + clear back link on placement detail

**Files:**
- Modify: `src/app/(pages)/placements/[id]/PlacementDetailClient.tsx`

QA §6.4 + §6.5: placement detail page has no clear "back to placements" path; closing the QR modal jumps the scroll position to top.

- [ ] **Step 1: Add a sticky breadcrumb at the top of the page**

```tsx
import Breadcrumbs from "@/components/Breadcrumbs";

// At the top of the rendered page body:
<div className="sticky top-14 lg:top-16 bg-background border-b border-border z-10 px-6 py-2">
  <Breadcrumbs
    items={[
      { label: "Placements", href: backHrefForRole(userType) },
      { label: placement.work_title || "Placement" },
    ]}
  />
</div>
```

Where `backHrefForRole` is a small helper (inline or in `lib/auth-roles` if you can land it there):

```tsx
function backHrefForRole(role: string | null): string {
  if (role === "venue") return "/venue-portal/placements";
  if (role === "artist") return "/artist-portal/placements";
  return "/";
}
```

- [ ] **Step 2: Fix QR modal close scroll jump**

Find the QR modal close handler. Whatever's currently there, replace its scroll-to-top logic with a no-op — the modal close should not move scroll. If the modal is wrapping the page in a way that forces scroll reset, lift it to a portal (`createPortal` to `document.body`):

```tsx
import { createPortal } from "react-dom";

// inside the modal render:
return createPortal(
  <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
    {/* ...existing content... */}
  </div>,
  document.body,
);
```

If `createPortal` is already used, the scroll jump is from a `useEffect` that runs `window.scrollTo`. Just delete that effect.

- [ ] **Step 3: Smoke**

Open a placement detail. Breadcrumb is visible at the top, sticky as you scroll. Click the work title — back to placements list. Open QR modal, close it — scroll position preserved.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(pages)/placements/[id]/PlacementDetailClient.tsx"
git commit -m "fix(placements): sticky breadcrumb + preserve scroll on QR modal close"
```

---

## Phase 6 — Header / footer / nav

### Task 13: Footer adds Venues directory + Complaints links

**Files:**
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Add to the right columns**

`For Artists` column — add `Browse Venues` linking `/venues`.
`Company` column — add `Complaints` linking `/complaints`.

```tsx
{
  title: "For Artists",
  links: [
    { label: "Apply to Join", href: "/apply" },
    { label: "Pricing", href: "/pricing" },
    { label: "Venue Demand", href: "/spaces-looking-for-art" },
    { label: "Browse Venues", href: "/venues" }, // <- new
    { label: "FAQs", href: "/faqs" },
  ],
},
// in Company:
{ label: "Complaints", href: "/complaints" }, // <- new, after Contact
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Footer.tsx
git commit -m "feat(footer): add Browse Venues + Complaints links"
```

---

### Task 14: Notifications dropdown — drop the legacy fallback

**Files:**
- Modify: `src/components/Header.tsx`

QA §3.15: the notifications dropdown derives notifications from `/api/placements` when `/api/notifications` returns nothing. This shadow-fallback can produce notifications that aren't in the DB and link to stale ids.

- [ ] **Step 1: Find the fallback block**

The current `loadNotifs` effect (around lines 233–280 of Header.tsx) does:

```tsx
const res = await authFetch("/api/notifications");
const data = await res.json();
const rows = Array.isArray(data.notifications) ? data.notifications : [];
if (rows.length > 0) {
  setNotifications(rows.slice(0, 12));
  return;
}
// Fallback: build from /api/placements + /api/messages — this is what we drop.
```

- [ ] **Step 2: Delete the fallback**

Replace with:

```tsx
async function loadNotifs() {
  try {
    const res = await authFetch("/api/notifications");
    const data = await res.json();
    const rows = Array.isArray(data.notifications) ? data.notifications : [];
    setNotifications(rows.slice(0, 12));
  } catch {
    setNotifications([]);
  }
}
```

The legacy fallback's purpose was to backfill before the notifications table existed. It does now, and its rows are written by the placement / message endpoints. The dropdown's empty-state message ("No new notifications") is the right outcome when there really are none.

- [ ] **Step 3: Smoke**

Sign in as a fresh user. Open the bell. Empty state. Trigger a real notification (place a placement request, log in as the recipient). Bell badge increments; dropdown shows the row.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "fix(notifications): drop legacy /api/placements derivation in dropdown"
```

---

### Task 15: Header — logged-out users have a "for venues" path

**Files:**
- Modify: `src/components/Header.tsx`

QA §6.3: a logged-out viewer thinking about being a venue can't easily get to venue-flavoured marketing.

- [ ] **Step 1: Add a "For Venues" link to publicNavLinks**

```tsx
const publicNavLinks: NavLink[] = [
  { label: "Marketplace", href: "/browse" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "For Venues", href: "/venues" },     // <- new (Plan D Task 17 creates the page)
  { label: "Blog", href: "/blog" },
  { label: "Spaces", href: "/spaces-looking-for-art" },
];
```

(If the nav becomes too crowded on `lg` viewports, fold "Spaces" into the More dropdown — the QA report already noted More is logged-in-only, so logged-out users see all the inline links.)

- [ ] **Step 2: Smoke**

In an incognito window visit `/`. Top nav now includes "For Venues". Click → `/venues` page (Task 17 ships the page itself).

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat(nav): logged-out users see a For Venues link"
```

---

### Task 16: Portal switcher menu

**Files:**
- Modify: `src/components/Header.tsx`

QA §6.7: a user with both an artist and a customer account from the same email gets stuck on whichever portal Supabase resolved first; no UI to switch.

This is a small feature, not just polish. We add a "Switch portal" item to the existing portal dropdown when the user has more than one role.

- [ ] **Step 1: Add a `/api/account/roles` endpoint**

```ts
// src/app/api/account/roles/route.ts
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const db = getSupabaseAdmin();
  const email = auth.user!.email;
  if (!email) return NextResponse.json({ roles: [] });

  // Look up other auth.users rows with the same email and read each user_metadata.user_type.
  // We only return roles; we never expose user_ids of other accounts.
  const { data: matches } = await db.auth.admin.listUsers();
  const same = (matches?.users || []).filter((u) => u.email?.toLowerCase() === email.toLowerCase());
  const roles = Array.from(
    new Set(
      same
        .map((u) => u.user_metadata?.user_type)
        .filter((r): r is string => typeof r === "string"),
    ),
  );
  return NextResponse.json({ roles });
}
```

(For a large user base, `listUsers` is too coarse. If the project has direct-Supabase access, replace with a parameterised query: `select user_metadata->>'user_type' from auth.users where lower(email) = lower($1)`.)

- [ ] **Step 2: Header reads roles + renders a switcher**

In `Header.tsx`, alongside the existing portal-dropdown logic, fetch `roles` once. If `roles.length > 1`, render a "Switch portal" sub-menu listing the others with a button that calls a small `/api/account/switch-role` endpoint…

OK actually account-switching is non-trivial — Supabase sessions are per-account. The simplest "switch" UX is: sign out, then redirect to login pre-filled with the email. Implement that.

```tsx
// In the portal dropdown, when roles.length > 1:
{otherRoles.map((r) => (
  <li key={r}>
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.push(`/login?email=${encodeURIComponent(email)}&hint=${r}`);
      }}
      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-[#FAF8F5] transition-colors"
    >
      Switch to {r} portal
    </button>
  </li>
))}
```

Login page can read `?email=` and pre-fill the email field.

- [ ] **Step 3: Smoke**

Set up a test where the same email has two accounts (artist + customer). Sign in as one. Header dropdown shows "Switch to {other} portal". Click → sign out → land on login with email pre-filled. Sign in with the other account's password → land on that portal.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/account/roles/route.ts src/components/Header.tsx \
        "src/app/(pages)/login/page.tsx"
git commit -m "feat(account): role switcher for users with multiple accounts on one email"
```

---

## Phase 7 — Missing pages

### Task 17: Public `/venues` landing page parity with `/artists`

**Files:**
- Modify: `src/app/(pages)/venues/page.tsx`

The existing `/venues/page.tsx` is a directory listing of venues, not a marketing landing. Replace (or split) it so:
- `/venues` becomes the marketing/landing page (parallel to `/artists`)
- Existing directory becomes `/venues/directory` (or move to `/spaces-looking-for-art` if that's already the directory) — verify in code first

- [ ] **Step 1: Audit current `/venues` and `/artists`**

```bash
ls "src/app/(pages)/venues" "src/app/(pages)/artists"
head -40 "src/app/(pages)/venues/page.tsx"
head -40 "src/app/(pages)/artists/page.tsx"
```

Observe what's at each path. If `/venues/page.tsx` is a directory list, decide: rename to `directory/page.tsx` and create a new landing at `/venues/page.tsx`, OR overlay landing-style copy at the top of the existing list.

Decision rule: if there's already `/spaces-looking-for-art`, that's the directory — and `/venues/page.tsx` is free to become the marketing landing.

- [ ] **Step 2: Implement landing page**

Mirror `/artists/page.tsx` structure:
- Hero (full-bleed image, h1, sub-headline, primary CTA "Register your venue")
- Value blocks (3 columns: free to display, optional revenue share, free curation)
- How It Works (3 steps)
- Pricing summary (link to `/pricing`)
- Testimonial / spotlight section if `/artists` has one — match
- Footer CTA

Read `/artists/page.tsx` first; copy its component structure with venue-flavoured copy. Don't reinvent the layout.

- [ ] **Step 3: Smoke**

Visit `/venues`. Looks like a marketing landing, not a list. Click "Register your venue" → `/register-venue`. Mobile: hero crops cleanly, blocks stack.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(pages)/venues/page.tsx"
git commit -m "feat(venues): public /venues landing page parity with /artists"
```

---

### Task 18: Empty Showroom CTA

**Files:**
- Modify: `src/app/(pages)/artist-portal/showroom/page.tsx`

QA §6.6: a brand-new artist with zero showrooms sees no clear "create your first showroom" CTA.

- [ ] **Step 1: Add EmptyState (Task 2 component) when count is zero**

```tsx
import EmptyState from "@/components/EmptyState";

// In the render branch:
if (showrooms.length === 0) {
  return (
    <EmptyState
      title="No showrooms yet"
      hint="A showroom lets venues see your work hanging on real walls. It takes about 5 minutes."
      cta={{ label: "Create your first showroom", href: "/artist-portal/showroom/new" }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(pages)/artist-portal/showroom/page.tsx"
git commit -m "feat(showroom): empty-state CTA for new artists"
```

---

### Task 19: OAuth flag-off — say so

**Files:**
- Modify: `src/app/(pages)/login/page.tsx`
- Modify: `src/app/(pages)/signup/artist/page.tsx`
- Modify: `src/app/(pages)/signup/customer/page.tsx`

QA §6.8: `OAUTH_GOOGLE_APPLE` flag is off; the OAuth section is silently hidden — users assume it's not supported.

- [ ] **Step 1: When flag is off, render a small note instead of nothing**

In each of the three pages, find the existing `{isFlagOn("OAUTH_GOOGLE_APPLE") && (…)}` block. Add an else branch:

```tsx
{isFlagOn("OAUTH_GOOGLE_APPLE") ? (
  <>{/* existing OAuth buttons */}</>
) : (
  <p className="text-[11px] text-muted text-center mt-3">
    Email + password only for now. Google and Apple sign-in coming soon.
  </p>
)}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(pages)/login/page.tsx" \
        "src/app/(pages)/signup/artist/page.tsx" \
        "src/app/(pages)/signup/customer/page.tsx"
git commit -m "fix(auth): tell users when OAuth is temporarily disabled"
```

---

### Task 20: Gate `/dev/*` and `/profile-designs` in production

**Files:**
- Modify: `src/app/(pages)/dev/profile-designs/[slug]/page.tsx`
- Modify: `src/app/(pages)/profile-designs/page.tsx`

QA §6.11: dev preview routes are routable in production. Plan A's robots.ts blocked indexing; Plan D blocks loading.

- [ ] **Step 1: Add a top-of-file gate**

```tsx
import { notFound } from "next/navigation";

// At the very top of the default-exported page component (server component):
if (process.env.NODE_ENV === "production") notFound();

// (rest of the page unchanged)
```

For client components, do the gate inside the component:

```tsx
"use client";
import { notFound } from "next/navigation";
// ...
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  // ...
}
```

- [ ] **Step 2: Smoke**

`NODE_ENV=production npm run build && NODE_ENV=production npm run start`. Visit `/profile-designs` and `/dev/profile-designs/anything` — both 404.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(pages)/dev/profile-designs/[slug]/page.tsx" \
        "src/app/(pages)/profile-designs/page.tsx"
git commit -m "fix(dev): preview routes 404 in production"
```

---

## Phase 8 — Final verification

### Task 21: Full check + smoke + open PR

- [ ] **Step 1: `npm run check`**

Lint + typecheck + tests clean. The new test files this plan added:
- `src/components/Breadcrumbs.test.tsx`
- `src/components/EmptyState.test.tsx`
- `src/context/ToastContext.test.tsx` (if extended)
- `src/components/PortalGuard.test.tsx` (extended)
- `src/components/CounterPlacementDialog.test.tsx`
- `src/lib/carrier-tracking.test.ts`

- [ ] **Step 2: `npm run build`** — clean.

- [ ] **Step 3: 16-step manual smoke**

Use the demo accounts (Maya Chen + Copper Kettle + a customer):

1. Breadcrumbs visible on artwork detail, artist profile, collection detail, venue detail.
2. Empty states with CTAs on every portal list when no rows.
3. Sign in as customer, navigate `/artist-portal` — toast appears, redirect to `/customer-portal`.
4. Already signed in, hit `/login` — toast "already signed in", redirect.
5. Counter offer: try to enter 51% — input clamps. Helper text "Max 50% to the venue" visible. Note past 600 chars truncates. Counter cancel restores scroll position.
6. Order with a UPS-format tracking number — link points to ups.com.
7. Multi-artist cart — each artist group has its own fulfilment row.
8. Add a work to a collection, delete it from portfolio, view collection in artist portal — "Work removed from portfolio" inline. View public collection — work hidden.
9. Placement detail page has sticky breadcrumb. Open QR modal, close — scroll position preserved.
10. Footer has "Browse Venues" + "Complaints" links.
11. Notifications dropdown for a fresh user — empty state, no derived rows.
12. Logged out, header has "For Venues" link → lands on the new `/venues` page.
13. User with two accounts (artist + customer, same email) — portal dropdown has "Switch to {other} portal".
14. `/venues` is the new marketing landing, not a list.
15. New artist with zero showrooms — empty-state CTA visible.
16. With `NEXT_PUBLIC_FLAG_OAUTH_GOOGLE_APPLE=` (unset/off), login + signup pages show "Email + password only for now" note.
17. Production build → `/dev/profile-designs/x` and `/profile-designs` both 404.

- [ ] **Step 4: Open PR**

```bash
git push -u origin claude/qa-d-navigation-ux
gh pr create --title "Plan D: navigation & UX" --body "$(cat <<'EOF'
## Summary

Closes the §3 (UX & navigation) and §6 (missing journeys) buckets from the 2026-04-30 pre-launch QA audit.

- Breadcrumbs on artwork, artist, collection, venue, placement detail
- Standardised empty states with explicit CTAs across portal lists
- Toast on PortalGuard role-redirect and login already-signed-in
- Counter dialog: 50% hint, 600-char note, sized textarea, dispatch error boundary
- Carrier tracking links auto-detected from tracking number format
- Per-artist fulfilment time on multi-artist orders
- Stale-price guard for works removed from portfolio
- Placement detail sticky breadcrumb + QR modal scroll preservation
- Footer Browse Venues + Complaints links
- Notifications dropdown legacy fallback removed
- Logged-out For Venues path
- Portal switcher for users with multiple accounts on one email
- Public /venues landing page parity with /artists
- Empty Showroom CTA
- OAuth flag-off message
- /dev and /profile-designs gated in production

## Test plan

- [ ] `npm run check` clean
- [ ] `npm run build` clean
- [ ] 16-step manual smoke in plan §21 passes
- [ ] Verify the /venues directory was either moved to /venues/directory or already lives at /spaces-looking-for-art (Task 17 step 1 audit)

## Out of scope

- Real-time toast framework upgrade (Plan F)
- Mobile-only z-index / tap targets (Plan E)
- Account merge / true session swap (Task 16 ships the simple sign-out-and-back-in switcher; full merge is a separate workstream)

## Depends on

Plan A's `RedirectIfLoggedIn`, `safeRedirect`, and `portalPathForRole`. If Plan A is unmerged, these can be inlined per task notes.
EOF
)"
```

---

## Self-review

**1. Spec coverage** — every §3.x and §6.x finding from the QA report has a task or is explicitly out of scope:
- §3.1 breadcrumbs → Task 1 + 4 ✓
- §3.2 search bar → **deferred to Plan F** (heavier feature; this plan keeps to nav scaffolding)
- §3.3 save logged-out flow → Plan A Task 6 already ✓
- §3.4 empty states → Task 2 + 5 ✓
- §3.5 portal redirect toast → Task 6 ✓
- §3.6 login already-signed-in toast → Task 7 ✓
- §3.7 + §3.8 + §3.16 counter dialog → Task 8 ✓
- §3.9 mobile filter sidebar → **Plan E** (mobile only)
- §3.10 stale prices → Task 11 ✓
- §3.11 carrier link → Task 9 ✓
- §3.12 payment-method icons → **Plan F** (decorative)
- §3.13 promo code field → **Plan B** (financial flow)
- §3.14 per-artist fulfilment → Task 10 ✓
- §3.15 notifications legacy fallback → Task 14 ✓
- §3.17 background refresh diff toast → **Plan F** (toast-system upgrade)
- §3.18 password minimums → already done in Plan A Task 7 ✓
- §6.1 /venues landing → Task 17 ✓
- §6.2 footer links → Task 13 ✓
- §6.3 logged-out venue tabs → Task 15 ✓
- §6.4 + §6.5 placement back-nav → Task 12 ✓
- §6.6 empty Showroom CTA → Task 18 ✓
- §6.7 portal switcher → Task 16 ✓
- §6.8 OAuth flag-off message → Task 19 ✓
- §6.9 order-confirmation email link → **Plan B / Plan F** (depends on signed token from Plan B)
- §6.10 newsletter unsubscribe → **Plan F** (email infra)
- §6.11 /dev gated → Task 20 ✓

15 covered in plan, 7 deferred to other plans, 2 already done in Plan A. Honest accounting.

**2. Placeholder scan:** every step has actual code or an exact command. The places that say "look at the existing pattern" are bounded: Task 5 (per-page CTAs are listed), Task 17 (audit existing layout first — required because the file shape needs to be confirmed), Task 14 (delete a block whose location is given by line number).

**3. Type / name consistency:**
- `BreadcrumbItem.label` / `.href` — consistent across Tasks 1, 4, 12 ✓
- `EmptyStateProps.cta = { label, href }` — consistent across Tasks 2, 5, 18 ✓
- `ToastOptions.{variant, durationMs}` — consistent across Tasks 3, 6, 7 ✓
- `detectCarrierUrl` returns `string | null` — same shape Task 9 produces and consumes ✓

**4. Independence:**
- Plan D Task 6 + 7 use Plan A's `portalPathForRole` and the `useEffect` shape Plan A introduced. If Plan A hasn't merged, inline the role-to-path mapping (the plan says where).
- Plan D Task 11 overlaps Plan C's collection territory. If both plans land, the change in `collections/page.tsx` happens once — Plan C's task touches a different conditional, no conflict.
- Plan D Task 19 collides with Plan A's signup edits (Plan A already touches the same OAuth blocks for Task 15). If Plan A has merged, just add the else branch alongside Plan A's signed-state logic.

**Risk notes:**
- Task 16's portal switcher uses `db.auth.admin.listUsers()` which is paginated (1000 / page by default). If the project has more than ~1000 users, replace with a direct SQL query as noted in the task.
- Task 17 is the largest task (a full landing page) — consider splitting into "audit + scaffold" + "fill copy" sub-PRs if review gets long.
- Task 20's `process.env.NODE_ENV === "production"` check works for `npm start` but Vercel preview deploys also set NODE_ENV=production; if you want the dev routes available on previews, gate by `NEXT_PUBLIC_VERCEL_ENV !== "production"` instead.

Plan looks complete. Ready to execute.

---

## Execution

Two paths:

**1. Subagent-driven** — Use `superpowers:subagent-driven-development`. Same loop Plans A and C use.

**2. Inline** — Use `superpowers:executing-plans`.

No new env vars needed. No DB migrations. No worktree-specific gotchas — the new `/api/account/roles` route uses existing `getSupabaseAdmin` infrastructure.
