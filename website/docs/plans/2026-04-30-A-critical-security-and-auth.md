# Plan A — Critical Security & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every critical-blocker security/auth gap surfaced in the 2026-04-30 pre-launch QA report, with TDD discipline and one mergeable PR per task so an outage never depends on the whole batch landing at once.

**Architecture:** A new `src/lib/auth-roles.ts` becomes the single source of truth for the four user roles. `src/lib/order-state-machine.ts` and `src/lib/oauth-state.ts` are introduced to replace ad-hoc rules. UI changes are minimal — the heavy lift is in API and lib code where security boundaries live. Every change is gated by a vitest unit test where pure logic is involved; integration-style tests use `vi.mock` of `@supabase/supabase-js` mirroring `src/app/api/walls/route.test.ts`.

**Tech Stack:** Next.js 16.2, React 19.2, Supabase JS 2.103, Vitest 2.1, Stripe 22, Zod 4, Resend 6. Tests are colocated `*.test.ts` siblings of the file under test (`vitest.config.ts:14`). Path alias `@/` → `src/` (`tsconfig.json:paths`).

**Out of scope for this plan (covered in Plan B–F):**
- Country dropdown / shipping divergence (Plan B)
- Cart persistence beyond Stripe metadata (Plan B)
- Stripe Connect pre-flight at checkout (Plan B)
- Refund authorization signed-token (Plan B — only the order-tracking signed-token lives here)
- All UX/mobile/polish work (Plans D–F)

**Branch strategy:**
- One worktree for the whole plan: `git worktree add .claude/worktrees/qa-a-critical-security claude/qa-a-critical-security` (run from repo root, branched off `main`).
- Each task ends with a `git commit`. After every 2–3 tasks, push and open an interim draft PR; ready-for-review when the whole plan is green.
- `npm run check` (lint + typecheck + vitest) MUST pass before each commit.

**Verification gates between phases:** After each phase below, run the full check suite (`npm run check`) and a manual smoke (`npm run dev`, hit /login, /signup, /apply, /checkout, /admin) before moving on. The plan does not move on to the next phase until those gates pass.

**Phases:**
1. Foundation (auth-roles lib, AuthContext whitelist, signup guards)
2. Login `?next=` redirect
3. Email-verification gate
4. Order state machine
5. Self-purchase prevention
6. Admin hardening
7. OAuth signed state
8. Robots & cleanup

---

## Phase 1 — Auth foundation

The whole plan depends on a typed, validated role helper. We build that first so every subsequent task can `import { ALLOWED_ROLES, isRole } from "@/lib/auth-roles"`.

### Task 1: Create `src/lib/auth-roles.ts` with tests

**Files:**
- Create: `src/lib/auth-roles.ts`
- Test:   `src/lib/auth-roles.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/auth-roles.test.ts
import { describe, expect, it } from "vitest";
import { ALLOWED_ROLES, isRole, parseRole, type UserRole } from "./auth-roles";

describe("ALLOWED_ROLES", () => {
  it("contains exactly the four supported roles", () => {
    expect(ALLOWED_ROLES).toEqual(["artist", "venue", "customer", "admin"]);
  });
});

describe("isRole()", () => {
  it("accepts every allowed role", () => {
    for (const r of ALLOWED_ROLES) {
      expect(isRole(r)).toBe(true);
    }
  });

  it.each([null, undefined, "", "ARTIST", "owner", 42, {}, [], true])(
    "rejects %p",
    (input) => {
      expect(isRole(input)).toBe(false);
    },
  );
});

describe("parseRole()", () => {
  it("returns the role when valid", () => {
    expect(parseRole("artist")).toBe<UserRole>("artist");
  });

  it("returns null for unknown values rather than throwing", () => {
    expect(parseRole("hacker")).toBeNull();
    expect(parseRole(undefined)).toBeNull();
    expect(parseRole(123)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth-roles.test.ts`
Expected: FAIL — "Cannot find module './auth-roles'".

- [ ] **Step 3: Implement**

```typescript
// src/lib/auth-roles.ts
//
// Single source of truth for the four user roles Wallplace supports.
// Every place that reads `user_metadata.user_type` MUST go through
// parseRole() so a corrupt / unexpected value never propagates.

export const ALLOWED_ROLES = ["artist", "venue", "customer", "admin"] as const;

export type UserRole = (typeof ALLOWED_ROLES)[number];

export function isRole(value: unknown): value is UserRole {
  return typeof value === "string" && (ALLOWED_ROLES as readonly string[]).includes(value);
}

export function parseRole(value: unknown): UserRole | null {
  return isRole(value) ? value : null;
}

/**
 * The portal path a user lands on after a successful auth event.
 * Centralised so login and signup pages stay in sync.
 */
export function portalPathForRole(role: UserRole | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "venue":
      return "/venue-portal";
    case "customer":
      return "/customer-portal";
    case "artist":
      return "/artist-portal";
    default:
      return "/browse";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth-roles.test.ts`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-roles.ts src/lib/auth-roles.test.ts
git commit -m "feat(auth): add typed role helper as single source of truth"
```

---

### Task 2: Whitelist `userType` in AuthContext

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Test:   `src/context/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/context/AuthContext.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";

// Mock the supabase client BEFORE importing the context.
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
  },
}));

import { AuthProvider, useAuth } from "./AuthContext";

function Probe() {
  const { userType } = useAuth();
  return <span data-testid="role">{userType ?? "null"}</span>;
}

function renderWithUser(metadata: Record<string, unknown>) {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "u1", email: "x@y.com", user_metadata: metadata } } },
  });
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthContext userType resolution", () => {
  it("resolves a valid role", async () => {
    renderWithUser({ user_type: "artist" });
    await waitFor(() => expect(screen.getByTestId("role").textContent).toBe("artist"));
  });

  it("returns null for an unknown user_type rather than letting it leak through", async () => {
    renderWithUser({ user_type: "hacker" });
    await waitFor(() => expect(screen.getByTestId("role").textContent).toBe("null"));
  });

  it("returns null when user_type is missing entirely", async () => {
    renderWithUser({});
    await waitFor(() => expect(screen.getByTestId("role").textContent).toBe("null"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/context/AuthContext.test.tsx`
Expected: FAIL — the unknown-role test currently passes the string through (`"hacker"` is rendered).

- [ ] **Step 3: Implement**

Modify `src/context/AuthContext.tsx`. Replace the `userType` line and update the interface:

Replace lines 1–9 (top of file, the imports + interface declaration) — change the existing import block to add the role helper:

```typescript
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { parseRole, type UserRole } from "@/lib/auth-roles";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userType: UserRole | null;
  displayName: string | null;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    metadata: { user_type: UserRole; display_name: string },
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}
```

Replace the `userType` constant near line 120:

```typescript
  const userType = parseRole(user?.user_metadata?.user_type);
  const displayName = (user?.user_metadata?.display_name as string) ?? null;
```

(The literal-union cast is gone; `parseRole` returns `UserRole | null`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/context/AuthContext.test.tsx`
Expected: PASS — 3 tests pass.

Run also: `npm run typecheck`
Expected: clean (the interface change to `UserRole` is now consistent across consumers).

- [ ] **Step 5: Commit**

```bash
git add src/context/AuthContext.tsx src/context/AuthContext.test.tsx
git commit -m "fix(auth): whitelist userType through parseRole helper"
```

---

### Task 3: Add already-logged-in guard to `/signup`, `/signup/artist`, `/signup/customer`, `/register-venue`

**Files:**
- Create: `src/components/RedirectIfLoggedIn.tsx`
- Test:   `src/components/RedirectIfLoggedIn.test.tsx`
- Modify: `src/app/(pages)/signup/page.tsx`
- Modify: `src/app/(pages)/signup/artist/page.tsx`
- Modify: `src/app/(pages)/signup/customer/page.tsx`
- Modify: `src/app/(pages)/register-venue/page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/RedirectIfLoggedIn.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const useAuthMock = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import RedirectIfLoggedIn from "./RedirectIfLoggedIn";

describe("<RedirectIfLoggedIn />", () => {
  beforeEach(() => {
    replace.mockReset();
    useAuthMock.mockReset();
  });

  it("renders children when no user", () => {
    useAuthMock.mockReturnValue({ user: null, userType: null, loading: false });
    const { getByText } = render(
      <RedirectIfLoggedIn>
        <span>welcome</span>
      </RedirectIfLoggedIn>,
    );
    expect(getByText("welcome")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects an artist to /artist-portal", async () => {
    useAuthMock.mockReturnValue({ user: { id: "u" }, userType: "artist", loading: false });
    render(
      <RedirectIfLoggedIn>
        <span>x</span>
      </RedirectIfLoggedIn>,
    );
    expect(replace).toHaveBeenCalledWith("/artist-portal");
  });

  it("redirects a customer to /customer-portal", async () => {
    useAuthMock.mockReturnValue({ user: { id: "u" }, userType: "customer", loading: false });
    render(
      <RedirectIfLoggedIn>
        <span>x</span>
      </RedirectIfLoggedIn>,
    );
    expect(replace).toHaveBeenCalledWith("/customer-portal");
  });

  it("does nothing while auth is still loading", () => {
    useAuthMock.mockReturnValue({ user: null, userType: null, loading: true });
    render(
      <RedirectIfLoggedIn>
        <span>x</span>
      </RedirectIfLoggedIn>,
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/RedirectIfLoggedIn.test.tsx`
Expected: FAIL — "Cannot find module './RedirectIfLoggedIn'".

- [ ] **Step 3: Implement**

Create `src/components/RedirectIfLoggedIn.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { portalPathForRole } from "@/lib/auth-roles";

/**
 * Wraps signup / register pages. If a user is already logged in, send
 * them to their portal so they can't accidentally create a duplicate
 * account or be confused by a fresh signup form.
 */
export default function RedirectIfLoggedIn({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, userType, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(portalPathForRole(userType));
  }, [loading, user, userType, router]);

  if (!loading && user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-muted">You&rsquo;re already signed in. Redirecting&hellip;</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

Now wrap the four signup-style pages. For each, modify the file to add the import and wrap the existing returned JSX.

For `src/app/(pages)/signup/page.tsx`, the page is currently a server component. We need to keep it server but introduce a client wrapper. Replace the file's `default export` with:

```tsx
// Top of file: replace the existing import block
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import RedirectIfLoggedIn from "@/components/RedirectIfLoggedIn";
```

(Keep the `metadata` and `options` constants exactly as they are.) Then change the default-export function: wrap the existing returned `<div>` in `<RedirectIfLoggedIn>…</RedirectIfLoggedIn>`. Concretely:

```tsx
export default function SignUpPage() {
  return (
    <RedirectIfLoggedIn>
      <div className="relative min-h-[calc(110vh-3.5rem)] sm:min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)] flex items-center justify-center">
        {/* …existing body unchanged… */}
      </div>
    </RedirectIfLoggedIn>
  );
}
```

For `src/app/(pages)/signup/artist/page.tsx`, `src/app/(pages)/signup/customer/page.tsx`, and `src/app/(pages)/register-venue/page.tsx` — these are already `"use client"`. Add the import at the top (just below the existing imports):

```tsx
import RedirectIfLoggedIn from "@/components/RedirectIfLoggedIn";
```

And wrap the top-level return JSX:

```tsx
return (
  <RedirectIfLoggedIn>
    <div className="min-h-screen flex items-center justify-center relative">
      {/* …existing body unchanged… */}
    </div>
  </RedirectIfLoggedIn>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/RedirectIfLoggedIn.test.tsx`
Expected: PASS — 4 tests pass.

Run also: `npm run typecheck && npm run lint`
Expected: clean.

Manual smoke (do this before committing):
1. `npm run dev`
2. Sign in as the demo Maya Chen artist account.
3. Navigate to `/signup/artist`, `/signup/customer`, `/register-venue`, and `/signup` in sequence.
4. Each should briefly show "redirecting…" and land on `/artist-portal`. No form should be visible.

- [ ] **Step 5: Commit**

```bash
git add src/components/RedirectIfLoggedIn.tsx src/components/RedirectIfLoggedIn.test.tsx \
        src/app/\(pages\)/signup/page.tsx \
        src/app/\(pages\)/signup/artist/page.tsx \
        src/app/\(pages\)/signup/customer/page.tsx \
        src/app/\(pages\)/register-venue/page.tsx
git commit -m "fix(auth): redirect already-logged-in users away from signup pages"
```

---

## Phase 2 — Login `?next=` redirect

The login form ignores `?next=` and the OAuth buttons hardcode `/browse`. Fix both, with an allowlist to avoid open redirects.

### Task 4: Add a safe-redirect helper

**Files:**
- Create: `src/lib/safe-redirect.ts`
- Test:   `src/lib/safe-redirect.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/safe-redirect.test.ts
import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect()", () => {
  it("returns the fallback when input is missing", () => {
    expect(safeRedirect(null, "/browse")).toBe("/browse");
    expect(safeRedirect(undefined, "/browse")).toBe("/browse");
    expect(safeRedirect("", "/browse")).toBe("/browse");
  });

  it("accepts a same-origin absolute path", () => {
    expect(safeRedirect("/apply", "/browse")).toBe("/apply");
    expect(safeRedirect("/checkout?ref=qr", "/browse")).toBe("/checkout?ref=qr");
  });

  it("rejects a fully-qualified URL (open-redirect attempt)", () => {
    expect(safeRedirect("https://evil.example.com/path", "/browse")).toBe("/browse");
    expect(safeRedirect("//evil.example.com/path", "/browse")).toBe("/browse");
  });

  it("rejects a path that doesn't start with /", () => {
    expect(safeRedirect("apply", "/browse")).toBe("/browse");
  });

  it("rejects /\\\\ tricks", () => {
    expect(safeRedirect("/\\evil.com", "/browse")).toBe("/browse");
  });

  it("strips javascript: and data: schemes even if URL-encoded", () => {
    expect(safeRedirect("javascript:alert(1)", "/browse")).toBe("/browse");
    expect(safeRedirect("/javascript:alert(1)", "/browse")).toBe("/browse");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/safe-redirect.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/safe-redirect.ts
//
// Validate user-supplied "?next=" / "?redirect=" values before passing
// them to router.replace() or window.location. The rule is intentionally
// strict: must start with a single forward slash, must not start with
// "//" (protocol-relative), must not contain a colon (blocks
// javascript:, data:, etc.), and must not contain a backslash (blocks
// "/\evil.com" tricks that some browsers treat as a hostname).

const REJECTED_SUBSTRINGS = [":", "\\"] as const;

export function safeRedirect(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  if (value.length === 0) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  for (const bad of REJECTED_SUBSTRINGS) {
    if (value.includes(bad)) return fallback;
  }
  return value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/safe-redirect.test.ts`
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/safe-redirect.ts src/lib/safe-redirect.test.ts
git commit -m "feat(auth): add safeRedirect helper for ?next= validation"
```

---

### Task 5: Login page honours `?next=`

**Files:**
- Modify: `src/app/(pages)/login/page.tsx`

- [ ] **Step 1: Write the failing test**

This is a client-page integration test. We mock the AuthContext and verify the redirect target.

```tsx
// src/app/(pages)/login/page.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const useAuthMock = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithOAuth: vi.fn() } },
}));

vi.mock("@/lib/feature-flags", () => ({ isFlagOn: () => false }));

import LoginPage from "./page";

beforeEach(() => {
  replace.mockReset();
  useAuthMock.mockReset();
  // Stub window.location.search for `?next=`
  Object.defineProperty(window, "location", {
    value: { search: "?next=/apply", origin: "http://localhost" },
    writable: true,
  });
});

describe("LoginPage redirect on already-logged-in", () => {
  it("redirects to ?next= when present and same-origin", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "u" },
      userType: "artist",
      loading: false,
      signIn: vi.fn(),
    });
    render(<LoginPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/apply"));
  });

  it("falls back to portal when ?next= is missing", async () => {
    Object.defineProperty(window, "location", {
      value: { search: "", origin: "http://localhost" },
      writable: true,
    });
    useAuthMock.mockReturnValue({
      user: { id: "u" },
      userType: "venue",
      loading: false,
      signIn: vi.fn(),
    });
    render(<LoginPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/venue-portal"));
  });

  it("falls back to portal when ?next= is an external URL", async () => {
    Object.defineProperty(window, "location", {
      value: { search: "?next=https://evil.com", origin: "http://localhost" },
      writable: true,
    });
    useAuthMock.mockReturnValue({
      user: { id: "u" },
      userType: "customer",
      loading: false,
      signIn: vi.fn(),
    });
    render(<LoginPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/customer-portal"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/\\\(pages\\\)/login/page.test.tsx`
Expected: FAIL — the test expects `/apply` but the current code always sends to portal.

- [ ] **Step 3: Implement**

Modify `src/app/(pages)/login/page.tsx`:

Add to the imports near the top:

```typescript
import { safeRedirect } from "@/lib/safe-redirect";
import { portalPathForRole } from "@/lib/auth-roles";
```

Replace the existing `useEffect` redirect block (currently lines 19–29) with:

```tsx
  // Redirect if already logged in. Honours ?next= so a deep link that
  // bounced the user through /login lands them back where they started.
  useEffect(() => {
    if (authLoading || !user) return;
    const next =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("next");
    router.replace(safeRedirect(next, portalPathForRole(userType)));
  }, [authLoading, user, userType, router]);
```

Replace the OAuth `redirectTo` strings (currently lines 153 and 166) so they propagate the `next` value. Find each `signInWithOAuth({ provider: "google" / "apple", options: { redirectTo: \`${window.location.origin}/browse\` } })` call and change it to:

```tsx
                  onClick={async () => {
                    const next =
                      new URLSearchParams(window.location.search).get("next") || "";
                    const dest = next
                      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect(next, "/browse"))}`
                      : `${window.location.origin}/browse`;
                    await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: dest },
                    });
                  }}
```

Apply the same change for the Apple button (provider: "apple"). The Google block additionally has `queryParams: { access_type: "offline", prompt: "consent" }` — preserve that. The Apple block has no `queryParams` — leave it that way.

After the form submit succeeds, the existing useEffect handles the redirect because user state updates trigger it. No extra change needed there.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/\\\(pages\\\)/login/page.test.tsx`
Expected: PASS — 3 tests pass.

Manual smoke:
1. `npm run dev`. Sign out.
2. Visit `/browse/copper-kettle` (a venue page). Click the "Save" heart.
3. The save action should redirect to `/login?next=/browse/copper-kettle`.
4. Sign in. After login, should land back on `/browse/copper-kettle`, not `/customer-portal`.

(If step 2 doesn't actually pass `?next=` yet, that's Task 6. The login change still works in isolation if you append `?next=/anything-safe` manually.)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(pages\)/login/page.tsx src/app/\(pages\)/login/page.test.tsx
git commit -m "fix(auth): login page honours ?next= and validates target"
```

---

### Task 6: Save / Message buttons pass `?next=` when bouncing to login

**Files:**
- Modify: `src/components/SaveButton.tsx`
- Modify: `src/components/MessageArtistButton.tsx`

(These are the two places in the codebase that bounce a logged-out user to login. We update them to preserve where the user was.)

- [ ] **Step 1: Read each file and find the redirect-to-login code path**

Run: `grep -nH "router.push.*login\\|/login" src/components/SaveButton.tsx src/components/MessageArtistButton.tsx`

The expected pattern is something like `router.push("/login")` or `<Link href="/login">`. Identify the exact line in each.

- [ ] **Step 2: Add a smoke test**

Because these components have lots of unrelated state, we keep the test small and targeted.

```tsx
// src/components/SaveButton.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/browse/copper-kettle",
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

import SaveButton from "./SaveButton";

beforeEach(() => push.mockReset());

describe("<SaveButton /> when logged out", () => {
  it("redirects to /login with ?next= matching the current page", () => {
    const { getByRole } = render(<SaveButton itemId="copper-kettle" itemType="venue" />);
    fireEvent.click(getByRole("button"));
    expect(push).toHaveBeenCalledWith("/login?next=%2Fbrowse%2Fcopper-kettle");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/SaveButton.test.tsx`
Expected: FAIL — currently pushes to `/login` without `?next=`.

- [ ] **Step 4: Implement in `SaveButton.tsx`**

Find the existing redirect call. Replace:

```tsx
router.push("/login");
```

With:

```tsx
router.push(`/login?next=${encodeURIComponent(pathname || "/browse")}`);
```

Where `pathname` comes from `usePathname()` (add the import: `import { usePathname } from "next/navigation"`).

- [ ] **Step 5: Apply the same change to `MessageArtistButton.tsx`**

Same pattern. Find the equivalent redirect in `MessageArtistButton.tsx`. If it's a `<Link>` rather than a programmatic push, swap it for a `<Link href={...}>` that interpolates `usePathname()`. Concretely:

```tsx
const pathname = usePathname();
return (
  <Link
    href={`/login?next=${encodeURIComponent(pathname || "/browse")}`}
    /* …rest of props unchanged… */
  >
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/SaveButton.test.tsx`
Expected: PASS.

Run also: `npm run check`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/SaveButton.tsx src/components/SaveButton.test.tsx \
        src/components/MessageArtistButton.tsx
git commit -m "fix(auth): save / message buttons preserve return path via ?next="
```

---

## Phase 3 — Email-verification gate

The signup pages currently auto-sign-in immediately after signUp, bypassing email verification. Typo'd emails reach a dead inbox; password resets and order receipts vanish. Fix the three signup flows and gate the portals on `email_confirmed_at`.

### Task 7: Remove auto-signin from artist, customer, and venue signups

**Files:**
- Modify: `src/app/(pages)/signup/artist/page.tsx`
- Modify: `src/app/(pages)/signup/customer/page.tsx`
- Modify: `src/app/(pages)/register-venue/page.tsx`
- Create: `src/app/(pages)/check-your-inbox/page.tsx`

- [ ] **Step 1: Write the new "check your inbox" page**

```tsx
// src/app/(pages)/check-your-inbox/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check your inbox – Wallplace",
  robots: { index: false, follow: false },
};

export default function CheckYourInboxPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-serif mb-4">Check your inbox</h1>
        <p className="text-sm text-muted leading-relaxed mb-6">
          We&rsquo;ve sent you a confirmation link. Click it to activate your
          account, then come back and sign in. The email may take a minute
          to arrive.
        </p>
        <p className="text-xs text-muted mb-8">
          Wrong email? Sign up again with the correct address — Wallplace
          won&rsquo;t auto-merge accounts, but the unverified one expires
          on its own after 7 days.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-accent text-white text-sm font-medium rounded-sm hover:bg-accent-hover transition-colors"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify `src/app/(pages)/signup/customer/page.tsx`**

Replace the existing `handleSubmit` (lines 20–71) with:

```tsx
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { user_type: "customer", display_name: name },
          emailRedirectTo: `${window.location.origin}/login?next=/browse`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Best-effort: record terms acceptance. Don't await — the user
      // doesn't need to wait on it, and it's fine if it lands a moment
      // later.
      fetch("/api/terms/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: email,
          userType: "customer",
          termsVersion: "v1.0-2026-04",
          termsType: "platform_tos",
        }),
      }).catch(() => {});

      router.push("/check-your-inbox");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }
```

Also bump the `<input minLength={6}>` for password to `minLength={8}` (line 124 area), and update placeholder text to "At least 8 characters". This brings the signup page in sync with the existing reset-password rule.

- [ ] **Step 3: Apply the equivalent change to `src/app/(pages)/signup/artist/page.tsx`**

Replace `handleSubmit` (lines 54–113):

```tsx
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { user_type: "artist", display_name: name },
          emailRedirectTo: `${window.location.origin}/login?next=/apply`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      fetch("/api/terms/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: email,
          userType: "artist",
          termsVersion: "v1.0-2026-04",
          termsType: "platform_tos",
        }),
      }).catch(() => {});

      router.push("/check-your-inbox");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }
```

Same `minLength={8}` change to the password input near line 176.

- [ ] **Step 4: Apply the equivalent change to `src/app/(pages)/register-venue/page.tsx`**

The venue flow is more involved because the current code creates a venue_profiles row using the just-signed-in session (`page.tsx:165-185`). Removing auto-signin means we have to move that insert server-side.

**Step 4a — extend the `/api/register-venue` endpoint to also seed the venue profile.**

Open `src/app/api/register-venue/route.ts`. After it persists the registration record, add a venue-profile insert using the admin client. Sketch:

```typescript
// After the existing record-write, additionally try to create the
// venue_profiles stub. This used to happen client-side after auto
// signin; now that we're requiring email verification, we seed it
// server-side using the service role so the venue can land on a
// working portal as soon as they confirm.
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// …inside POST, after the existing logic and right before returning success:
const db = getSupabaseAdmin();
const { data: existing } = await db
  .from("venue_profiles")
  .select("id")
  .eq("slug", venueSlug)
  .maybeSingle();
if (!existing) {
  const { error: profileErr } = await db.from("venue_profiles").insert({
    slug: venueSlug,
    name: form.venueName,
    type: form.venueType === "Other" && form.customVenueType ? form.customVenueType : form.venueType,
    location: form.city,
    contact_name: form.contactName,
    email: form.email,
    phone: form.phone,
    wall_space: form.wallSpace,
    // user_id stays NULL until the verified login lands and the venue-portal
    // page-level effect back-fills it on first visit (see Step 4c).
  });
  if (profileErr) {
    console.error("[register-venue] venue_profiles insert failed:", profileErr);
  }
}
```

Verify the column names against the existing schema (the values destructured here mirror the page-level POST that's being removed; if the existing `/api/venue-profile` endpoint normalises any field names — `wallSpace` → `wall_space`, etc. — match those exactly).

**Step 4b — replace the page's `handleSubmit` body.**

```tsx
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      setSubmitting(false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setSubmitting(false);
      return;
    }

    try {
      const venueSlug = slugify(form.venueName);

      // Persist the registration record AND seed the venue profile
      // server-side. The endpoint now does both in one call so the
      // verified login round-trip lands in a working portal.
      const regRes = await fetch("/api/register-venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, venueSlug }),
      });
      if (!regRes.ok) {
        const data = await regRes.json().catch(() => ({}));
        setError(data.error || "Could not create your venue. Please try again.");
        setSubmitting(false);
        return;
      }

      // Create auth account
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { user_type: "venue", display_name: form.contactName, venue_slug: venueSlug },
          emailRedirectTo: `${window.location.origin}/login?next=/venue-portal`,
        },
      });

      if (authError) {
        setError(authError.message || "Could not create account. Please try again.");
        setSubmitting(false);
        return;
      }

      // Terms (fire-and-forget, both flavours)
      const termsPayload = {
        userEmail: form.email,
        userType: "venue",
        termsVersion: "v1.0-2026-04",
      };
      fetch("/api/terms/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...termsPayload, termsType: "platform_tos" }),
      }).catch(() => {});
      fetch("/api/terms/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...termsPayload, termsType: "venue_agreement" }),
      }).catch(() => {});

      router.push("/check-your-inbox");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }
```

Also bump `<input minLength={6}>` to `minLength={8}` for password (line 115 area), and update the placeholder copy to "At least 8 characters".

**Step 4c — back-fill `venue_profiles.user_id` on first verified visit.**

Open `src/components/VenuePortalLayout.tsx`. Inside the existing auth-aware `useEffect`, after we know we have a session, add a one-shot back-fill:

```tsx
// One-time back-fill for venues registered after the email-verification
// gate landed: the profile was created server-side without a user_id
// because the user wasn't signed in yet.
useEffect(() => {
  if (!user || !user.email_confirmed_at) return;
  authFetch("/api/venue-profile", {
    method: "PATCH",
    body: JSON.stringify({ adoptIfOrphan: true }),
  }).catch(() => {});
}, [user]);
```

And in `src/app/api/venue-profile/route.ts` (PATCH branch), accept `adoptIfOrphan: true` — when set, find the venue_profile row with the matching email AND `user_id IS NULL`, set `user_id = auth.user.id`. No-op otherwise. Sketch:

```typescript
if (body.adoptIfOrphan) {
  const db = getSupabaseAdmin();
  const { data: orphan } = await db
    .from("venue_profiles")
    .select("id")
    .eq("email", auth.user!.email)
    .is("user_id", null)
    .maybeSingle();
  if (orphan) {
    await db
      .from("venue_profiles")
      .update({ user_id: auth.user!.id })
      .eq("id", orphan.id);
  }
  return NextResponse.json({ ok: true });
}
```

If the existing PATCH route doesn't already exist or doesn't have this branch, add it preserving the rest of its behaviour.

- [ ] **Step 5: Run typecheck + lint**

Run: `npm run check`
Expected: clean.

Manual smoke:
1. `npm run dev`. Sign out.
2. Sign up as a new customer with a real email.
3. After submit, you should land on `/check-your-inbox`, not `/browse`.
4. Open the email Supabase sends, click the verification link.
5. The link should land on `/login?next=/browse`. Sign in. You should arrive on `/browse`.
6. Repeat for artist (`?next=/apply`) and venue (`?next=/venue-portal`).

- [ ] **Step 6: Commit**

```bash
git add src/app/\(pages\)/check-your-inbox/page.tsx \
        src/app/\(pages\)/signup/artist/page.tsx \
        src/app/\(pages\)/signup/customer/page.tsx \
        src/app/\(pages\)/register-venue/page.tsx
git commit -m "fix(auth): require email verification before sign-in"
```

---

### Task 8: PortalGuard requires `email_confirmed_at`

**Files:**
- Modify: `src/components/PortalGuard.tsx`

- [ ] **Step 1: Add a test**

```tsx
// src/components/PortalGuard.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/artist-portal",
}));

const useAuthMock = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/api-client", () => ({
  authFetch: vi.fn(async () => ({
    json: async () => ({ profile: { review_status: "approved", subscription_status: "active" } }),
  })),
}));

import PortalGuard from "./PortalGuard";

beforeEach(() => {
  replace.mockReset();
  useAuthMock.mockReset();
});

describe("<PortalGuard /> email confirmation gate", () => {
  it("blocks access for an unverified artist", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "u", email_confirmed_at: null },
      userType: "artist",
      loading: false,
    });
    render(
      <PortalGuard allowedType="artist">
        <span>portal</span>
      </PortalGuard>,
    );
    await waitFor(() => expect(screen.queryByText("portal")).toBeNull());
    expect(screen.getByText(/verify/i)).toBeTruthy();
  });

  it("allows access for a verified artist with active subscription", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "u", email_confirmed_at: "2026-01-01T00:00:00Z" },
      userType: "artist",
      loading: false,
    });
    render(
      <PortalGuard allowedType="artist">
        <span>portal</span>
      </PortalGuard>,
    );
    await waitFor(() => expect(screen.getByText("portal")).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PortalGuard.test.tsx`
Expected: FAIL — currently the unverified artist passes through.

- [ ] **Step 3: Implement**

Modify `src/components/PortalGuard.tsx`. Inside the component body, after the `if (!user) return null;` check (around line 99), add a verification gate:

```tsx
  if (user && !user.email_confirmed_at) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <h2 className="text-xl font-serif mb-3">Verify your email</h2>
          <p className="text-sm text-muted mb-6">
            We sent a confirmation link to <span className="font-medium">{user.email}</span>.
            Click it to finish setting up your account, then come back and sign in.
          </p>
        </div>
      </div>
    );
  }
```

Place this gate AFTER the `if (!user) return null;` and BEFORE the artist-only subscription gate. Order matters — an unverified artist must see the verify-email screen, not the choose-a-plan screen.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/PortalGuard.test.tsx`
Expected: PASS — both tests.

Run also: `npm run typecheck`. Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/PortalGuard.tsx src/components/PortalGuard.test.tsx
git commit -m "fix(auth): portal requires email_confirmed_at before granting access"
```

---

## Phase 4 — Order state machine

Currently `/api/orders` PATCH validates `status` against a set but allows any forward/backward transition. An artist can mark a paid order `delivered` instantly without ever shipping, releasing payouts early. We add a state machine.

### Task 9: Create `lib/order-state-machine.ts`

**Files:**
- Create: `src/lib/order-state-machine.ts`
- Test:   `src/lib/order-state-machine.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/order-state-machine.test.ts
import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  canTransition,
  type OrderStatus,
} from "./order-state-machine";

describe("ORDER_STATUSES", () => {
  it("contains the canonical lifecycle", () => {
    expect(ORDER_STATUSES).toEqual([
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]);
  });
});

describe("canTransition()", () => {
  // Forward path
  it.each([
    ["confirmed", "processing"],
    ["processing", "shipped"],
    ["shipped", "delivered"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toEqual({ ok: true });
  });

  // Cancellation
  it.each([
    ["confirmed", "cancelled"],
    ["processing", "cancelled"],
    ["shipped", "cancelled"],
  ] as const)("allows %s → cancelled", (from, to) => {
    expect(canTransition(from, to)).toEqual({ ok: true });
  });

  // Terminal states
  it("blocks anything out of delivered (terminal)", () => {
    for (const to of ORDER_STATUSES) {
      const result = canTransition("delivered", to);
      expect(result.ok).toBe(false);
    }
  });

  it("blocks anything out of cancelled (terminal)", () => {
    for (const to of ORDER_STATUSES) {
      const result = canTransition("cancelled", to);
      expect(result.ok).toBe(false);
    }
  });

  // Backward / skipping
  it("blocks shipped → processing (backward)", () => {
    expect(canTransition("shipped", "processing")).toEqual({
      ok: false,
      reason: expect.stringContaining("shipped"),
    });
  });

  it("blocks confirmed → delivered (skip)", () => {
    expect(canTransition("confirmed", "delivered")).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });

  // Unknown values
  it("rejects unknown status values", () => {
    expect(canTransition("confirmed", "in_orbit" as OrderStatus)).toEqual({
      ok: false,
      reason: expect.any(String),
    });
    expect(canTransition("alien" as OrderStatus, "shipped")).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/order-state-machine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/order-state-machine.ts
//
// Order lifecycle: confirmed → processing → shipped → delivered.
// Cancelled is reachable from any non-terminal state. delivered and
// cancelled are both terminal. Backward transitions and skips are
// blocked so the artist can't, say, mark an order delivered the moment
// it's paid (which would release the 14-day pending transfer early).

export const ORDER_STATUSES = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export type TransitionResult = { ok: true } | { ok: false; reason: string };

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: OrderStatus, to: OrderStatus): TransitionResult {
  if (!isOrderStatus(from)) {
    return { ok: false, reason: `Unknown current status: ${from}` };
  }
  if (!isOrderStatus(to)) {
    return { ok: false, reason: `Unknown target status: ${to}` };
  }
  if (TRANSITIONS[from].includes(to)) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: `Order is ${from}; cannot move to ${to}.`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/order-state-machine.test.ts`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/order-state-machine.ts src/lib/order-state-machine.test.ts
git commit -m "feat(orders): introduce explicit order state machine"
```

---

### Task 10: Wire state machine into `/api/orders` PATCH

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Test:   `src/app/api/orders/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/orders/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    user: { id: "u-artist", email: "a@x.com" },
    error: null,
  })),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

vi.mock("@/lib/email", () => ({ notifyBuyerStatusUpdate: vi.fn(async () => {}) }));
vi.mock("@/lib/stripe-connect", () => ({ executeTransfer: vi.fn(async () => {}) }));

import { PATCH } from "./route";

function chainSelectSingle(row: unknown) {
  return {
    select: () => ({
      eq: () => ({ single: async () => ({ data: row }) }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
  };
}

beforeEach(() => fromMock.mockReset());

describe("PATCH /api/orders state machine", () => {
  function req(body: unknown): Request {
    return new Request("http://localhost/api/orders", {
      method: "PATCH",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects confirmed → delivered with 422", async () => {
    fromMock.mockImplementation(() =>
      chainSelectSingle({
        artist_user_id: "u-artist",
        artist_slug: "alice",
        status: "confirmed",
        status_history: [],
        buyer_email: "b@x.com",
      }),
    );
    const res = await PATCH(req({ orderId: "o1", status: "delivered" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/cannot move to delivered/);
  });

  it("allows confirmed → processing", async () => {
    fromMock.mockImplementation(() =>
      chainSelectSingle({
        artist_user_id: "u-artist",
        status: "confirmed",
        status_history: [],
      }),
    );
    const res = await PATCH(req({ orderId: "o1", status: "processing" }));
    expect(res.status).toBe(200);
  });

  it("rejects shipped → processing (backward)", async () => {
    fromMock.mockImplementation(() =>
      chainSelectSingle({
        artist_user_id: "u-artist",
        status: "shipped",
        status_history: [],
      }),
    );
    const res = await PATCH(req({ orderId: "o1", status: "processing" }));
    expect(res.status).toBe(422);
  });

  it("rejects anything out of cancelled (terminal)", async () => {
    fromMock.mockImplementation(() =>
      chainSelectSingle({
        artist_user_id: "u-artist",
        status: "cancelled",
        status_history: [],
      }),
    );
    const res = await PATCH(req({ orderId: "o1", status: "shipped" }));
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/orders/route.test.ts`
Expected: FAIL — currently the API allows `confirmed → delivered` (no state machine).

- [ ] **Step 3: Implement**

Modify `src/app/api/orders/route.ts`. At the top of the file, add the import:

```typescript
import { canTransition, type OrderStatus, ORDER_STATUSES } from "@/lib/order-state-machine";
```

Replace the `validStatuses` block in the PATCH handler (currently lines 92–95). Update the `select` query so we also fetch the current `status`:

```typescript
    if (!ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
```

Then update the existing `db.from("orders").select(...)` near line 103 to include `status`:

```typescript
    const { data: order } = await db
      .from("orders")
      .select("artist_user_id, artist_slug, buyer_email, status, status_history, placement_id, venue_revenue")
      .eq("id", orderId)
      .single();
```

After the `if (!authorised)` 403 check (around line 124), add the transition guard before the status update:

```typescript
    const transition = canTransition(order.status as OrderStatus, status as OrderStatus);
    if (!transition.ok) {
      return NextResponse.json({ error: transition.reason }, { status: 422 });
    }
```

Leave the rest of the PATCH handler (history append, delivered side-effects, cancelled side-effects) unchanged. The state machine is the only new gate.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/orders/route.test.ts`
Expected: PASS — 4 tests pass.

Run also `npm run check`. Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/orders/route.ts src/app/api/orders/route.test.ts
git commit -m "fix(orders): enforce state-machine transitions on PATCH /api/orders"
```

---

## Phase 5 — Self-purchase prevention

An artist could put their own work in the cart and check out. Money cycles through Stripe Connect, the platform pays itself a fee from the artist's own card. Block at checkout creation time.

### Task 11: Block self-purchase in `/api/checkout`

**Files:**
- Modify: `src/app/api/checkout/route.ts`
- Test:   `src/app/api/checkout/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/checkout/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: vi.fn(async (req: Request) => {
    if (req.headers.get("authorization") === "Bearer artist-alice") {
      return { user: { id: "u-alice", email: "alice@x.com" }, error: null };
    }
    return { user: null, error: null };
  }),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

const stripeCreate = vi.fn(async () => ({ url: "https://stripe.example/session" }));
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: stripeCreate } } },
}));

vi.mock("@/lib/shipping-checkout", () => ({
  calculateOrderShipping: () => ({ totalShipping: 0, artistGroups: [] }),
}));

vi.mock("@/lib/validations", () => ({
  checkoutSchema: {
    safeParse: (b: unknown) => ({ success: true, data: b }),
  },
}));

import { POST } from "./route";

beforeEach(() => {
  fromMock.mockReset();
  stripeCreate.mockClear();
});

function req(body: unknown, auth = "Bearer artist-alice"): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const makeBody = (artistSlug: string) => ({
  items: [
    {
      title: "Untitled",
      artistSlug,
      artistName: "Alice",
      price: 100,
      quantity: 1,
      size: "S",
      image: "",
      shippingPrice: 5,
      internationalShippingPrice: 12,
      dimensions: null,
      framed: false,
    },
  ],
  shipping: {
    fullName: "Alice",
    email: "alice@x.com",
    phone: "",
    addressLine1: "1 St",
    addressLine2: "",
    city: "London",
    postcode: "E1",
    country: "United Kingdom",
    notes: "",
  },
});

describe("POST /api/checkout self-purchase guard", () => {
  it("rejects when authenticated artist's slug matches a cart item", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { slug: "alice", user_id: "u-alice" } }) }),
      }),
    }));
    const res = await POST(req(makeBody("alice")));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/own work/i);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("permits a guest checkout (no auth)", async () => {
    const res = await POST(req(makeBody("alice"), ""));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalled();
  });

  it("permits an artist buying a different artist's work", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { slug: "alice", user_id: "u-alice" } }) }),
      }),
    }));
    const res = await POST(req(makeBody("bob")));
    expect(res.status).toBe(200);
    expect(stripeCreate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/checkout/route.test.ts`
Expected: FAIL — current code lets the artist check out their own slug.

- [ ] **Step 3: Implement**

Modify `src/app/api/checkout/route.ts`:

Add at top:

```typescript
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
```

Modify the POST handler. Right after `const { items, shipping } = parsed.data;` (around line 15) and before the line-items mapping, add the self-purchase guard:

```typescript
    // Self-purchase guard. Auth is optional (guest checkout still
    // allowed), but if the caller IS authenticated and is the artist
    // behind any cart item, refuse.
    const auth = await getAuthenticatedUser(request).catch(() => ({ user: null, error: null }));
    if (auth.user) {
      const db = getSupabaseAdmin();
      const { data: artistProfile } = await db
        .from("artist_profiles")
        .select("slug")
        .eq("user_id", auth.user.id)
        .single();
      if (artistProfile?.slug) {
        const conflict = items.some(
          (it) => (it.artistSlug || "").toLowerCase() === artistProfile.slug.toLowerCase(),
        );
        if (conflict) {
          return NextResponse.json(
            { error: "You can't purchase your own work." },
            { status: 403 },
          );
        }
      }
    }
```

Note `getAuthenticatedUser` returns a 401 NextResponse when no token; we wrap in `.catch(() => ({ user: null, error: null }))` so guests aren't blocked by missing auth.

Wait — `getAuthenticatedUser` doesn't throw, it returns a tuple. We need to guard differently:

```typescript
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const auth = await getAuthenticatedUser(request);
      if (auth.user) {
        const db = getSupabaseAdmin();
        const { data: artistProfile } = await db
          .from("artist_profiles")
          .select("slug")
          .eq("user_id", auth.user.id)
          .single();
        if (artistProfile?.slug) {
          const conflict = items.some(
            (it) => (it.artistSlug || "").toLowerCase() === artistProfile.slug.toLowerCase(),
          );
          if (conflict) {
            return NextResponse.json(
              { error: "You can't purchase your own work." },
              { status: 403 },
            );
          }
        }
      }
    }
```

Use this version in the file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/checkout/route.test.ts`
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/checkout/route.ts src/app/api/checkout/route.test.ts
git commit -m "fix(checkout): block artists from purchasing their own work"
```

---

## Phase 6 — Admin hardening

### Task 12: Admin auth requires `user_metadata.user_type === "admin"`

**Files:**
- Modify: `src/lib/admin-auth.ts`
- Create: `src/lib/admin-auth.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/admin-auth.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ auth: { getUser } }),
}));

import { getAdminUser } from "./admin-auth";

beforeEach(() => {
  getUser.mockReset();
  process.env.ADMIN_EMAILS = "boss@example.com";
});

function req(token: string | null = "Bearer x"): Request {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = token;
  return new Request("http://localhost/api/admin/x", { headers });
}

describe("getAdminUser()", () => {
  it("returns the user when email + role both match", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u", email: "boss@example.com", user_metadata: { user_type: "admin" } } },
      error: null,
    });
    const result = await getAdminUser(req());
    expect(result.user?.id).toBe("u");
    expect(result.error).toBeNull();
  });

  it("403s when email is allowlisted but user_metadata.user_type !== 'admin'", async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: "u", email: "boss@example.com", user_metadata: { user_type: "artist" } },
      },
      error: null,
    });
    const result = await getAdminUser(req());
    expect(result.user).toBeNull();
    expect(result.error?.status).toBe(403);
  });

  it("403s when user_metadata.user_type is missing entirely", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u", email: "boss@example.com", user_metadata: {} } },
      error: null,
    });
    const result = await getAdminUser(req());
    expect(result.error?.status).toBe(403);
  });

  it("503s when ADMIN_EMAILS is unset", async () => {
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_EMAIL;
    getUser.mockResolvedValue({
      data: { user: { id: "u", email: "boss@example.com" } },
      error: null,
    });
    const result = await getAdminUser(req());
    expect(result.error?.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/admin-auth.test.ts`
Expected: FAIL — the second and third tests pass through (current code only checks email).

- [ ] **Step 3: Implement**

Modify `src/lib/admin-auth.ts`. After the email allowlist check (line 46–51), add a metadata check:

```typescript
  if (!user.email || !allowed.includes(user.email.toLowerCase())) {
    return {
      user: null,
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  // Defence in depth: even if the email is allowlisted, require
  // user_metadata.user_type === "admin". This blocks an attacker who
  // compromises an allowlisted email but cannot also set the metadata
  // field through the admin API.
  const role = (user.user_metadata as { user_type?: unknown } | null)?.user_type;
  if (role !== "admin") {
    return {
      user: null,
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  return { user, error: null };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/admin-auth.test.ts`
Expected: PASS — 4 tests.

Manual verification: ensure your own admin account in Supabase has `user_metadata.user_type = "admin"` set. If not, run a one-off Supabase SQL to backfill:

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"user_type": "admin"}'::jsonb
WHERE email IN (SELECT lower(unnest(string_to_array(current_setting('app.admin_emails', true), ','))));
```

(or just: `UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"user_type":"admin"}'::jsonb WHERE email = 'you@wallplace.co.uk';`)

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-auth.ts src/lib/admin-auth.test.ts
git commit -m "fix(admin): require user_metadata.user_type='admin' in addition to email allowlist"
```

---

### Task 13: Admin application PATCH refuses non-pending applications

**Files:**
- Modify: `src/app/api/admin/applications/[id]/route.ts`
- Test:   `src/app/api/admin/applications/[id]/route.test.ts`

(The admin UI disables buttons for non-pending applications, but the server doesn't enforce. Anyone with admin access who replays an old request can flip an already-decided application.)

- [ ] **Step 1: Read the file to confirm the shape**

Run: `grep -n "action" src/app/api/admin/applications/\\[id\\]/route.ts | head -20`

Identify where `action === "accept"` and `action === "reject"` branches are.

- [ ] **Step 2: Write the test**

```typescript
// src/app/api/admin/applications/[id]/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin-auth", () => ({
  getAdminUser: vi.fn(async () => ({
    user: { id: "u-admin", email: "admin@x.com", user_metadata: { user_type: "admin" } },
    error: null,
  })),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock, auth: { admin: { getUserById: vi.fn() } } }),
}));

vi.mock("@/lib/email", () => ({
  notifyArtistApplicationAccepted: vi.fn(async () => {}),
  notifyArtistApplicationRejected: vi.fn(async () => {}),
}));

import { PUT } from "./route";

beforeEach(() => fromMock.mockReset());

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/applications/123", {
    method: "PUT",
    headers: { authorization: "Bearer x", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/admin/applications/[id] state guard", () => {
  it("refuses to act on an already-accepted application", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { id: "123", status: "accepted" } }) }),
      }),
    }));
    const res = await PUT(req({ action: "reject", feedback: "x" }), {
      params: Promise.resolve({ id: "123" }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already/i);
  });

  it("refuses to act on a rejected application", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { id: "123", status: "rejected" } }) }),
      }),
    }));
    const res = await PUT(req({ action: "accept" }), {
      params: Promise.resolve({ id: "123" }),
    });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/app/api/admin/applications/\\\[id\\\]/route.test.ts`
Expected: FAIL — server currently accepts the action regardless of current status.

- [ ] **Step 4: Implement**

Open `src/app/api/admin/applications/[id]/route.ts`. Find the start of the PUT handler. After the admin auth check and before the action-specific branches, add a status guard:

```typescript
  const { data: existing, error: fetchErr } = await db
    .from("artist_applications")
    .select("id, status")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Application is already ${existing.status}.` },
      { status: 409 },
    );
  }
```

(Look at the existing file for the exact variable names — adapt `db`, `id` to whatever the file already uses. The check inserts BEFORE the existing accept/reject branches.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/app/api/admin/applications/\\\[id\\\]/route.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/applications/\[id\]/route.ts \
        src/app/api/admin/applications/\[id\]/route.test.ts
git commit -m "fix(admin): refuse application decisions on non-pending rows"
```

---

## Phase 7 — OAuth signed state

OAuth finalize trusts the `role` body param. Anyone who started signup as a customer could swap to `artist` on the finalize call. Replace with a signed state string the OAuth provider round-trips.

### Task 14: Create `lib/oauth-state.ts`

**Files:**
- Create: `src/lib/oauth-state.ts`
- Test:   `src/lib/oauth-state.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/oauth-state.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { signOAuthState, verifyOAuthState } from "./oauth-state";

beforeEach(() => {
  process.env.OAUTH_STATE_SECRET = "test-secret-not-for-prod";
});

describe("signOAuthState() / verifyOAuthState()", () => {
  it("round-trips a payload", async () => {
    const token = await signOAuthState({ role: "artist", next: "/apply" });
    const payload = await verifyOAuthState(token);
    expect(payload).toEqual({ role: "artist", next: "/apply" });
  });

  it("rejects a tampered token", async () => {
    const token = await signOAuthState({ role: "customer", next: "/browse" });
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifyOAuthState(tampered)).rejects.toThrow();
  });

  it("rejects expired tokens", async () => {
    const token = await signOAuthState({ role: "venue", next: "/v" }, { ttlSeconds: -1 });
    await expect(verifyOAuthState(token)).rejects.toThrow(/expired/i);
  });

  it("throws when secret is unset", async () => {
    delete process.env.OAUTH_STATE_SECRET;
    await expect(signOAuthState({ role: "artist", next: "/apply" })).rejects.toThrow(
      /OAUTH_STATE_SECRET/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/oauth-state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/oauth-state.ts
//
// HMAC-signed OAuth state. The `state` query param is what providers
// like Google round-trip back to /auth/callback. We stash the signup
// role + return path inside it so the callback can't be lied to about
// what role the user originally chose.

import { createHmac, timingSafeEqual } from "node:crypto";
import { isRole, type UserRole } from "./auth-roles";

interface Payload {
  role: UserRole;
  next: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
}

const DEFAULT_TTL_SECONDS = 15 * 60; // 15 minutes

function getSecret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s) throw new Error("OAUTH_STATE_SECRET is not configured");
  return s;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded + "=".repeat((4 - (padded.length % 4)) % 4), "base64");
}

export interface SignOptions {
  ttlSeconds?: number;
}

export async function signOAuthState(
  data: { role: UserRole; next: string },
  opts: SignOptions = {},
): Promise<string> {
  const secret = getSecret();
  const payload: Payload = {
    role: data.role,
    next: data.next,
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = base64url(JSON.stringify(payload));
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = payload.iat + ttl;
  const signed = `${encoded}.${expiresAt}`;
  const sig = base64url(createHmac("sha256", secret).update(signed).digest());
  return `${signed}.${sig}`;
}

export async function verifyOAuthState(token: string): Promise<{ role: UserRole; next: string }> {
  const secret = getSecret();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed state");
  const [encoded, expiresAtStr, sig] = parts;
  const expiresAt = Number.parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt)) throw new Error("Malformed state");

  const expectedSig = base64url(
    createHmac("sha256", secret).update(`${encoded}.${expiresAtStr}`).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid signature");
  }
  if (Math.floor(Date.now() / 1000) > expiresAt) {
    throw new Error("State expired");
  }

  const payloadJson = fromBase64url(encoded).toString();
  const payload = JSON.parse(payloadJson) as { role: unknown; next: unknown };
  if (!isRole(payload.role)) throw new Error("Bad role in state");
  if (typeof payload.next !== "string") throw new Error("Bad next in state");
  return { role: payload.role, next: payload.next };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/oauth-state.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Add the env var to `.env.example`**

Open `.env.example`. Under the existing required-env block, add:

```bash
# Required if OAUTH_GOOGLE_APPLE flag is on. Used to sign the OAuth
# state parameter so the callback can't be lied to about the role the
# user chose at signup. 32+ random bytes recommended.
OAUTH_STATE_SECRET=""
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/oauth-state.ts src/lib/oauth-state.test.ts .env.example
git commit -m "feat(auth): HMAC-sign OAuth state to bind role to a flow"
```

---

### Task 15: Wire signed state into OAuth flow

**Files:**
- Modify: `src/app/(pages)/login/page.tsx`
- Modify: `src/app/(pages)/signup/artist/page.tsx`
- Modify: `src/app/(pages)/signup/customer/page.tsx`
- Modify: `src/app/auth/callback/page.tsx`
- Modify: `src/app/api/auth/oauth-finalize/route.ts`
- Create: `src/app/api/auth/oauth-sign-state/route.ts`

We need a server endpoint to mint state (so the secret stays server-side), and `oauth-finalize` switches from accepting `role` in the body to verifying state from the URL.

- [ ] **Step 1: Create the state-minter endpoint**

```typescript
// src/app/api/auth/oauth-sign-state/route.ts
import { NextResponse } from "next/server";
import { signOAuthState } from "@/lib/oauth-state";
import { isRole } from "@/lib/auth-roles";
import { safeRedirect } from "@/lib/safe-redirect";

export async function POST(request: Request) {
  let body: { role?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const next = safeRedirect(body.next, "/browse");
  const state = await signOAuthState({ role: body.role, next }).catch(() => null);
  if (!state) {
    return NextResponse.json({ error: "OAuth not configured" }, { status: 503 });
  }
  return NextResponse.json({ state });
}
```

- [ ] **Step 2: Update `oauth-finalize` to verify state instead of role body**

Open `src/app/api/auth/oauth-finalize/route.ts`. Replace the role-from-body parse:

Old (lines 34–43):
```typescript
  let body: { role?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const requestedRole = body.role;
  if (!requestedRole || !ALLOWED_ROLES.includes(requestedRole as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
```

New:
```typescript
  let body: { state?: string } = {};
  try {
    body = await request.json();
  } catch {}
  if (!body.state) {
    return NextResponse.json({ error: "Missing state" }, { status: 400 });
  }
  let verified: { role: Role; next: string };
  try {
    const v = await verifyOAuthState(body.state);
    verified = { role: v.role as Role, next: v.next };
  } catch (err) {
    console.warn("[oauth-finalize] state verify failed:", err);
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
  }
  const requestedRole = verified.role;
```

Add the import at the top:

```typescript
import { verifyOAuthState } from "@/lib/oauth-state";
```

- [ ] **Step 3: Update the OAuth buttons to mint state**

For each of the three pages (`login`, `signup/artist`, `signup/customer`), wrap the `signInWithOAuth` call so it first POSTs to `/api/auth/oauth-sign-state` and uses the returned token as the state.

Generic pattern (apply to all three pages — adapt the role string per page):

```tsx
// Replace the existing onClick handler for Google + Apple buttons:
onClick={async () => {
  // Mint signed state so /auth/callback can prove which role the user
  // chose. Falls back to the legacy redirect if the endpoint isn't
  // available (e.g. local dev without OAUTH_STATE_SECRET).
  const next =
    new URLSearchParams(window.location.search).get("next") || "/apply"; // <- /apply for artist; /browse for login/customer
  let state = "";
  try {
    const res = await fetch("/api/auth/oauth-sign-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "artist" /* swap per page */, next }),
    });
    if (res.ok) state = (await res.json()).state || "";
  } catch {
    /* fall through */
  }
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent", state },
    },
  });
}}
```

For the Apple button on each page, drop `access_type: "offline", prompt: "consent"` (those are Google-specific), keep `state`.

For `login/page.tsx`, the role per button isn't pre-known; pass `role: "customer"` as a default so a returning user without metadata gets bucketed correctly (the finalize endpoint never overwrites an existing user_type, per the existing code path).

- [ ] **Step 4: Update `/auth/callback` to forward state to finalize**

Open `src/app/auth/callback/page.tsx`. Replace the body of the IIFE that calls `/api/auth/oauth-finalize` (around lines 52–62):

```tsx
      // Read the signed state out of the URL. Supabase passes through
      // the OAuth provider's `state` param; if missing we skip
      // finalize and just redirect (the user is signed in regardless).
      const state = params.get("state") || "";
      let nextHref = next;
      if (state) {
        try {
          const res = await authFetch("/api/auth/oauth-finalize", {
            method: "POST",
            body: JSON.stringify({ state }),
          });
          const data = await res.json().catch(() => ({}));
          if (data.next) nextHref = data.next;
        } catch (err) {
          console.error("[auth/callback] oauth-finalize failed:", err);
        }
      }

      if (!cancelled) window.location.replace(nextHref);
```

For this to work, update `oauth-finalize` to also return `next` so the callback uses the verified value rather than what was on the URL:

```typescript
  return NextResponse.json({ ok: true, role: finalRole, next: verified.next });
```

- [ ] **Step 5: Run typecheck + tests**

Run: `npm run check`
Expected: clean. (No new vitest tests beyond the unit tests already covering oauth-state — exercising `oauth-finalize` end-to-end is best done in the Playwright suite, which is out of scope for this plan.)

Manual smoke (only meaningful if `NEXT_PUBLIC_FLAG_OAUTH_GOOGLE_APPLE=1` and OAuth providers are configured in Supabase):
1. Sign out.
2. From `/signup/artist`, click "Google".
3. Authorise. Check that `/auth/callback?...&state=...` lands and redirects to `/apply`.
4. Verify the user's `user_metadata.user_type === "artist"` in Supabase.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth/oauth-sign-state/route.ts \
        src/app/api/auth/oauth-finalize/route.ts \
        src/app/auth/callback/page.tsx \
        src/app/\(pages\)/login/page.tsx \
        src/app/\(pages\)/signup/artist/page.tsx \
        src/app/\(pages\)/signup/customer/page.tsx
git commit -m "fix(auth): bind OAuth role to signed state, drop body-trust"
```

---

## Phase 8 — Robots & cleanup

### Task 16: Add internal routes to robots.ts

**Files:**
- Modify: `src/app/robots.ts`
- Test:   `src/app/robots.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/robots.test.ts
import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots()", () => {
  it("disallows every internal route", () => {
    const config = robots();
    const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    const disallow = rule.disallow as string[];
    for (const path of [
      "/api/",
      "/admin/",
      "/artist-portal/",
      "/venue-portal/",
      "/customer-portal/",
      "/checkout/",
      "/reset-password/",
      "/forgot-password/",
      "/placements/",
      "/email-preview/",
      "/dev/",
      "/demo/",
      "/auth/",
      "/check-your-inbox/",
    ]) {
      expect(disallow).toContain(path);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/robots.test.ts`
Expected: FAIL — `/email-preview/`, `/dev/`, `/demo/`, `/auth/`, `/check-your-inbox/` aren't currently disallowed.

- [ ] **Step 3: Implement**

Replace the body of `src/app/robots.ts`:

```typescript
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://wallplace.co.uk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/artist-portal/",
          "/venue-portal/",
          "/customer-portal/",
          "/checkout/",
          "/reset-password/",
          "/forgot-password/",
          "/placements/",
          "/email-preview/",
          "/dev/",
          "/demo/",
          "/auth/",
          "/check-your-inbox/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/robots.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/robots.ts src/app/robots.test.ts
git commit -m "fix(seo): hide internal routes (auth, dev, demo, email-preview) from robots"
```

---

## Final phase — Plan-wide verification

### Task 17: Full check + manual sweep

- [ ] **Step 1: Run the full check suite**

```bash
npm run check
```

Expected: lint clean, typecheck clean, all vitest suites green. The new test files added by this plan are:
- `src/lib/auth-roles.test.ts`
- `src/lib/safe-redirect.test.ts`
- `src/lib/order-state-machine.test.ts`
- `src/lib/oauth-state.test.ts`
- `src/lib/admin-auth.test.ts`
- `src/components/RedirectIfLoggedIn.test.tsx`
- `src/components/PortalGuard.test.tsx`
- `src/components/SaveButton.test.tsx`
- `src/context/AuthContext.test.tsx`
- `src/app/(pages)/login/page.test.tsx`
- `src/app/api/orders/route.test.ts`
- `src/app/api/checkout/route.test.ts`
- `src/app/api/admin/applications/[id]/route.test.ts`
- `src/app/robots.test.ts`

If any test fails: fix the underlying issue, re-run, do not move on. Don't disable failing tests.

- [ ] **Step 2: Run a build to catch SSR/prerender breakage**

```bash
npm run build
```

Expected: clean build. Pay attention to any "static prerender" warnings that mention auth pages — `/auth/callback`, `/check-your-inbox`. Both should be marked dynamic given they read window/searchParams.

- [ ] **Step 3: Manual smoke against the demo accounts**

Bring up `npm run dev` and run through this checklist:

1. **Login `?next=`** — sign out. Visit `/browse/copper-kettle/some-work`. Click Save (heart). Land on `/login?next=...`. Sign in as Maya Chen. Should arrive back on the artwork page, not `/artist-portal`.

2. **Signup verification gate** — sign out. Sign up as a brand-new customer. Land on `/check-your-inbox`. Confirm the email arrived. Click the link. Land on `/login?next=/browse`. Sign in. Land on `/browse`.

3. **Already-logged-in signup guard** — signed in as Maya Chen, navigate to `/signup`, `/signup/artist`, `/signup/customer`, `/register-venue`. Each should redirect to `/artist-portal`.

4. **Email-confirm gate** — log in as Maya Chen but disable her `email_confirmed_at` in Supabase (`UPDATE auth.users SET email_confirmed_at = NULL WHERE email = 'maya@example.com';`). Visit `/artist-portal`. Should see the "Verify your email" gate, not the dashboard. Re-set `email_confirmed_at = NOW()` and re-verify access is restored.

5. **Order state machine** — find a Copper-Kettle order in Supabase, set its status to `confirmed`. Curl `PATCH /api/orders` with `{ orderId: "...", status: "delivered" }` and a Maya Chen Bearer token. Expect 422 with the state-machine error message. Then `processing → shipped → delivered` in sequence; each should succeed.

6. **Self-purchase block** — as Maya Chen, add one of her own works to cart. Hit `/api/checkout`. Expect 403, "You can't purchase your own work."

7. **Admin auth depth** — set Maya Chen's email as the only `ADMIN_EMAILS`, but with `user_metadata.user_type = "artist"`. Try to hit `/api/admin/applications`. Expect 403. Set `user_type = "admin"`. Expect 200.

8. **OAuth state binding** (only if `OAUTH_GOOGLE_APPLE=1`): from `/signup/artist`, click Google. Confirm finalize lands the user as an artist even if you tamper the URL (e.g. `?role=customer` query before the callback) — the signed state wins.

9. **Robots** — `curl http://localhost:3000/robots.txt`. Confirm all 14 disallow entries are present.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin claude/qa-a-critical-security
gh pr create --title "Plan A: critical security & auth" --body "$(cat <<'EOF'
## Summary

Closes the critical-blocker bucket from the 2026-04-30 pre-launch QA audit.

- Login `?next=` redirect honoured (was being silently dropped)
- Signups removed auto-signin; users must verify email before portal access
- Order state machine enforced on PATCH /api/orders (no skip-to-delivered)
- Self-purchase blocked at /api/checkout
- Admin auth requires both email allowlist AND user_metadata.user_type = "admin"
- OAuth state HMAC-signed so role can't be swapped post-signup
- Internal routes added to robots.ts

## Test plan

- [ ] `npm run check` clean
- [ ] `npm run build` clean
- [ ] All 14 manual smoke checks in plan §17 pass
- [ ] Confirm Supabase admin user has `user_metadata.user_type = "admin"` set in prod before merging

## Out of scope (future plans)

- Country dropdown / shipping divergence (Plan B)
- Refund signed-token (Plan B)
- UX/mobile/polish (Plans D-F)
EOF
)"
```

---

## Self-review

This section is for the plan author (me). Done before handing off.

**1. Spec coverage** (sections from the QA report this plan covers):
- §1.1 Login redirect → Tasks 4–6 ✓
- §1.4 Email verification gate → Tasks 7–8 ✓
- §1.6 Self-purchase prevention → Task 11 ✓
- §1.8 Order state machine → Tasks 9–10 ✓
- §1.10 Robots.ts → Task 16 ✓
- §4.2 AuthContext role whitelist → Tasks 1–2 ✓
- §4.4 Already-logged-in signup guards → Task 3 ✓
- §4.6 Admin user_type check → Task 12 ✓
- §4.7 OAuth signed state → Tasks 14–15 ✓
- §4.10 Admin application status enforcement → Task 13 ✓

**Dropped from Plan A** (verified during context-gathering as non-issues OR moved to other plans):
- §1.2 Stripe webhook secret — `src/app/api/webhooks/stripe/route.ts:36-41` already returns 500 if the env var is empty/missing. Not a bug.
- §1.3 Order-tracking signed token — the existing endpoint is rate-limited (12/min), constant-response, returns only safe fields. Not a critical blocker. Moved to Plan B as a defence-in-depth task alongside refund-token.
- §1.7 Stripe Connect pre-flight — moved to Plan B (financial integrity).
- §1.9 ApplicationGate hard block — `src/components/ApplicationGate.tsx:68-86` already returns the soft-block notice for non-artists; the form is NOT rendered. Original QA finding was wrong.
- §4.3 AuthContext signUp interface excludes "customer" — cosmetic TS type issue; customer signup uses raw supabase. Folded into Task 2's interface tidy.
- §4.5 Pending-artist subscription bypass — pending artists are correctly granted limited portal access without subscription so they can build their profile (`PortalGuard.tsx:67-72`). The current behaviour is intentional and not a security issue; the gate that matters (placements requiring approval) is enforced server-side at `api/placements/route.ts:747-758`. Not a blocker.

**2. Placeholder scan:** none — every step has actual code or an exact command.

**3. Type/name consistency:**
- `UserRole`, `parseRole`, `isRole`, `ALLOWED_ROLES`, `portalPathForRole` — used identically across all tasks ✓
- `OrderStatus`, `ORDER_STATUSES`, `canTransition` — used identically ✓
- `safeRedirect(input, fallback)` — same signature in all consumers ✓
- `signOAuthState` / `verifyOAuthState` — same payload shape `{ role, next }` everywhere ✓

Plan looks complete. Ready to execute.
