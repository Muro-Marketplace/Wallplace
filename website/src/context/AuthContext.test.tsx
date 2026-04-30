// src/context/AuthContext.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor, screen } from "@testing-library/react";

// Use vi.hoisted so the mock variables are initialised before vi.mock hoisting.
const { mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
}));

// Mock the supabase client BEFORE importing the context.
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
  const { userType, loading } = useAuth();
  return <span data-testid="role">{loading ? "loading" : (userType ?? "null")}</span>;
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

afterEach(() => cleanup());

describe("AuthContext userType resolution", () => {
  it("resolves a valid role", async () => {
    renderWithUser({ user_type: "artist" });
    // Wait for loading to complete, then verify the role
    await waitFor(() => expect(screen.getByTestId("role").textContent).not.toBe("loading"));
    expect(screen.getByTestId("role").textContent).toBe("artist");
  });

  it("returns null for an unknown user_type rather than letting it leak through", async () => {
    renderWithUser({ user_type: "hacker" });
    // Wait for loading to complete, then verify hacker is NOT passed through
    await waitFor(() => expect(screen.getByTestId("role").textContent).not.toBe("loading"));
    expect(screen.getByTestId("role").textContent).toBe("null");
  });

  it("returns null when user_type is missing entirely", async () => {
    renderWithUser({});
    // Wait for loading to complete, then verify null
    await waitFor(() => expect(screen.getByTestId("role").textContent).not.toBe("loading"));
    expect(screen.getByTestId("role").textContent).toBe("null");
  });
});
