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
