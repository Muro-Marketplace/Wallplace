import { formatMonthlyFee, speakMonthlyFee } from "@/lib/work-terms";

/**
 * The orange terms line under a Galleries work card: the revenue share a venue
 * earns and, when the artist lists one, the monthly fee to take the work on paid
 * loan. Spec: docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md.
 *
 * A transparent spacer stands in when there is nothing to show, so cards in a
 * row keep the same height. Two terms can wrap on a narrow card, so the line
 * reserves two lines below `sm` and one from `sm` up.
 */
export interface WorkTermsLineProps {
  openToRevenueShare: boolean;
  revenueSharePercent?: number | null;
  openToFreeLoan: boolean;
  paidLoanMonthlyGbp?: number | null;
}

const LINE = "text-[11px] mt-1 leading-snug min-h-[2.75em] sm:min-h-[1.375em]";

export default function WorkTermsLine({
  openToRevenueShare,
  revenueSharePercent,
  openToFreeLoan,
  paidLoanMonthlyGbp,
}: WorkTermsLineProps) {
  const share =
    openToRevenueShare && revenueSharePercent != null && revenueSharePercent > 0 ? revenueSharePercent : null;
  const fee = openToFreeLoan && paidLoanMonthlyGbp != null && paidLoanMonthlyGbp > 0 ? paidLoanMonthlyGbp : null;

  if (share === null && fee === null) {
    return (
      <p className={LINE} aria-hidden="true">
        &nbsp;
      </p>
    );
  }

  const shareText = share !== null ? `${share}% Revenue Share` : null;
  const visible = [shareText, fee !== null ? `${formatMonthlyFee(fee)} Paid Loan` : null].filter(Boolean).join(" · ");
  const spoken = [shareText, fee !== null ? `${speakMonthlyFee(fee)} Paid Loan` : null].filter(Boolean).join(", ");

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
