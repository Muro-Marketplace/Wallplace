import { formatMonthlyFee, speakMonthlyFee } from "@/lib/work-terms";

/**
 * The orange terms line under a Galleries work card, and under Size & Price on
 * the work page: the revenue share a venue earns and, when the artist lists
 * one, the monthly fee to take the work on paid loan. Specs:
 * docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md and
 * 2026-09-13-work-arrangements-and-per-size-loan-fees-design.md.
 *
 * On a card a transparent spacer stands in when there is nothing to show, so
 * cards in a row keep the same height. Two terms can wrap on a narrow card, so
 * the line reserves two lines below `sm` and one from `sm` up.
 */
export interface WorkTermsLineProps {
  openToRevenueShare: boolean;
  revenueSharePercent?: number | null;
  openToFreeLoan: boolean;
  /** The fee to show: the lowest listed across sizes, or one size's own fee. */
  paidLoanFromGbp?: number | null;
  /** True when sizes list different fees, which the line words as "From". */
  paidLoanFeesVary?: boolean;
  /** Keep a blank row when there is nothing to show. Default true, for cards. */
  spacer?: boolean;
}

const LINE = "text-[11px] mt-1 leading-snug min-h-[2.75em] sm:min-h-[1.375em]";

export default function WorkTermsLine({
  openToRevenueShare,
  revenueSharePercent,
  openToFreeLoan,
  paidLoanFromGbp,
  paidLoanFeesVary = false,
  spacer = true,
}: WorkTermsLineProps) {
  const share =
    openToRevenueShare && revenueSharePercent != null && revenueSharePercent > 0 ? revenueSharePercent : null;
  const fee = openToFreeLoan && paidLoanFromGbp != null && paidLoanFromGbp > 0 ? paidLoanFromGbp : null;

  if (share === null && fee === null) {
    if (!spacer) return null;
    return (
      <p className={LINE} aria-hidden="true">
        &nbsp;
      </p>
    );
  }

  const from = paidLoanFeesVary ? "From " : "";
  const shareText = share !== null ? `${share}% Revenue Share` : null;
  const visible = [shareText, fee !== null ? `${from}${formatMonthlyFee(fee)} Paid Loan` : null]
    .filter(Boolean)
    .join(" · ");
  const spoken = [shareText, fee !== null ? `${from}${speakMonthlyFee(fee)} Paid Loan` : null]
    .filter(Boolean)
    .join(", ");

  return (
    <p className={`${LINE} text-accent font-medium`}>
      {visible === spoken ? (
        visible
      ) : (
        <>
          <span aria-hidden="true">{visible}</span>
          <span className="sr-only">{spoken}</span>
        </>
      )}
    </p>
  );
}
