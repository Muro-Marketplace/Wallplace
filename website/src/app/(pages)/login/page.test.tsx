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
