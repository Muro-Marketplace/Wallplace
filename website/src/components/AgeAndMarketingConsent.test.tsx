// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import AgeAndMarketingConsent from "./AgeAndMarketingConsent";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

function setup(overrides: Partial<React.ComponentProps<typeof AgeAndMarketingConsent>> = {}) {
  const onAgeChange = vi.fn();
  const onMarketingChange = vi.fn();
  render(
    <AgeAndMarketingConsent
      ageConfirmed={false}
      onAgeChange={onAgeChange}
      marketingOptIn={false}
      onMarketingChange={onMarketingChange}
      {...overrides}
    />,
  );
  return {
    onAgeChange,
    onMarketingChange,
    age: screen.getByTestId("age-confirm") as HTMLInputElement,
    marketing: screen.getByTestId("marketing-opt-in") as HTMLInputElement,
  };
}

describe("AgeAndMarketingConsent", () => {
  it("renders both boxes unticked", () => {
    // A pre-ticked marketing box is not consent under PECR, and a pre-ticked
    // age box is not a declaration. Neither may ever default to on.
    const { age, marketing } = setup();
    expect(age.checked).toBe(false);
    expect(marketing.checked).toBe(false);
  });

  it("makes the age box required and the marketing box optional", () => {
    const { age, marketing } = setup();
    expect(age.required).toBe(true);
    expect(age.getAttribute("aria-required")).toBe("true");
    expect(marketing.required).toBe(false);
  });

  it("reports each change to its own handler", () => {
    const { age, marketing, onAgeChange, onMarketingChange } = setup();

    fireEvent.click(age);
    expect(onAgeChange).toHaveBeenCalledWith(true);
    expect(onMarketingChange).not.toHaveBeenCalled();

    fireEvent.click(marketing);
    expect(onMarketingChange).toHaveBeenCalledWith(true);
    expect(onAgeChange).toHaveBeenCalledTimes(1);
  });

  it("reflects the values it is given", () => {
    const { age, marketing } = setup({ ageConfirmed: true, marketingOptIn: true });
    expect(age.checked).toBe(true);
    expect(marketing.checked).toBe(true);
  });

  it("says what the marketing box does and does not cover", () => {
    // Consent has to be specific. "Tips and recommendations" names the two
    // categories it actually sets, and the copy says transactional mail keeps
    // coming either way so nobody ticks it out of fear of missing an order.
    setup();
    expect(screen.getByText(/tips and recommendations/i)).toBeTruthy();
    expect(screen.getByText(/your orders and your placements/i)).toBeTruthy();
    expect(screen.getByText(/change this any time/i)).toBeTruthy();
  });

  it("links the Terms from the age declaration", () => {
    setup();
    const link = screen.getByText("Terms").closest("a");
    expect(link?.getAttribute("href")).toBe("/terms");
  });
});
