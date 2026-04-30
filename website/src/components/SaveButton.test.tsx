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

vi.mock("@/context/SavedContext", () => ({
  useSaved: () => ({ toggleSaved: vi.fn(), isSaved: () => false }),
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import SaveButton from "./SaveButton";

beforeEach(() => push.mockReset());

describe("<SaveButton /> when logged out", () => {
  it("redirects to /signup/customer with ?next= matching the current page", () => {
    const { getByRole } = render(
      <SaveButton type="artist" itemId="copper-kettle" />,
    );
    fireEvent.click(getByRole("button"));
    expect(push).toHaveBeenCalledWith(
      "/signup/customer?next=%2Fbrowse%2Fcopper-kettle",
    );
  });
});
