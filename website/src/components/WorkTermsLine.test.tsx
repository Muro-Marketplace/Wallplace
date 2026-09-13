// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import WorkTermsLine from "./WorkTermsLine";

afterEach(() => cleanup());

const open = { openToRevenueShare: true, openToFreeLoan: true };

describe("<WorkTermsLine />", () => {
  it("shows the share and the fee with a dot between them, and says it without the dot", () => {
    render(<WorkTermsLine {...open} revenueSharePercent={25} paidLoanFromGbp={40} />);
    expect(screen.getByText("25% Revenue Share · £40/month Paid Loan")).toBeTruthy();
    expect(screen.getByText("25% Revenue Share, £40 a month Paid Loan")).toBeTruthy();
  });

  it("shows the share alone when no fee is listed", () => {
    render(<WorkTermsLine {...open} revenueSharePercent={25} paidLoanFromGbp={null} />);
    expect(screen.getByText("25% Revenue Share")).toBeTruthy();
    expect(screen.queryByText(/Paid Loan/)).toBeNull();
  });

  it("shows the fee alone, with pence, when the artist is not open to revenue share", () => {
    render(<WorkTermsLine openToRevenueShare={false} openToFreeLoan revenueSharePercent={25} paidLoanFromGbp={42.5} />);
    expect(screen.getByText("£42.50/month Paid Loan")).toBeTruthy();
    expect(screen.queryByText(/Revenue Share/)).toBeNull();
  });

  it("hides a fee when the artist is not open to paid loans", () => {
    render(<WorkTermsLine openToRevenueShare openToFreeLoan={false} revenueSharePercent={25} paidLoanFromGbp={40} />);
    expect(screen.queryByText(/Paid Loan/)).toBeNull();
  });

  it("keeps a blank spacer row when there is nothing to show", () => {
    const { container } = render(<WorkTermsLine {...open} revenueSharePercent={0} paidLoanFromGbp={null} />);
    const line = container.querySelector("p");
    expect(line?.getAttribute("aria-hidden")).toBe("true");
    expect(line?.textContent?.trim()).toBe("");
  });

  it("says From when the sizes list different fees, in the visible and the spoken text", () => {
    render(<WorkTermsLine {...open} revenueSharePercent={20} paidLoanFromGbp={25} paidLoanFeesVary />);
    expect(screen.getByText("20% Revenue Share · From £25/month Paid Loan")).toBeTruthy();
    expect(screen.getByText("20% Revenue Share, From £25 a month Paid Loan")).toBeTruthy();
  });

  it("renders nothing, not a spacer, when asked for no spacer", () => {
    const { container } = render(
      <WorkTermsLine {...open} revenueSharePercent={0} paidLoanFromGbp={null} spacer={false} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
