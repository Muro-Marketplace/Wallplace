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
