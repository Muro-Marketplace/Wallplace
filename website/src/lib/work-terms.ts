/**
 * A work's own terms: whether it is offered on revenue share and on paid loan,
 * the share it offers a venue, and the monthly fee to take each size on loan.
 *
 * Specs: docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md, and
 * 2026-09-13-work-arrangements-and-per-size-loan-fees-design.md, which moved the
 * fee onto each size and added the two ticks.
 *
 * A work follows its artist's profile until the artist changes something on it:
 * a null tick or rate means "use the profile". A size with no listed fee shows
 * no price, and the work is still offered for paid loan.
 *
 * AGENTS.md: a derived value is computed in one exported function. Every
 * surface that shows or starts from a work's terms reads them through here.
 */

import { gbp } from "@/lib/curation-tiers";
import { PAID_LOAN_MIN_GBP } from "@/lib/pricing";

/** One size's listed monthly paid loan fee, as it sits in `pricing`. */
export interface LoanFeeSize {
  label: string;
  paidLoanMonthlyGbp?: number | null;
}

export interface WorkTermsInput {
  /** The work's own share, or null / undefined when it uses the default. */
  revenueShareOverride?: number | null;
  /** Null / undefined follows the profile's revenue share tick. */
  openToRevenueShareOverride?: boolean | null;
  /** Null / undefined follows the profile's paid loan tick. */
  openToFreeLoanOverride?: boolean | null;
  /** The work's sizes, each with its listed fee, if any. */
  pricing?: ReadonlyArray<LoanFeeSize> | null;
  /** Migration 148's single fee. Retired by 149; removed in task 11. */
  paidLoanMonthlyGbp?: number | null;
}

/** A selected work and the size chosen for it, if any. */
export type PlacementSelection = WorkTermsInput & { sizeLabel?: string | null };

export interface ArtistTermsInput {
  revenueSharePercent?: number | null;
  /** Missing reads as open, as the profile transform does. */
  openToRevenueShare?: boolean | null;
  openToFreeLoan?: boolean | null;
}

/** What GET /api/artist-works returns beside the works. */
export interface ArtistTermsPayload {
  revenueSharePercent: number | null;
  openToRevenueShare: boolean;
  openToFreeLoan: boolean;
}

export interface ResolvedWorkTerms {
  openToRevenueShare: boolean;
  /** 0 when the work is not open to revenue share. */
  revenueSharePercent: number;
  usesDefaultShare: boolean;
  openToFreeLoan: boolean;
  /** The lowest listed fee, or null when none is listed or paid loan is off. */
  paidLoanFromGbp: number | null;
  /** True when the listed fees differ between sizes. */
  paidLoanFeesVary: boolean;
  /** Migration 148's single fee. Removed in task 11. */
  paidLoanMonthlyGbp: number | null;
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** The fees a work lists, in size order, skipping sizes with none. */
function listedFees(work: WorkTermsInput): number[] {
  return (work.pricing ?? [])
    .map((size) => finiteOrNull(size?.paidLoanMonthlyGbp))
    .filter((fee): fee is number => fee !== null && fee > 0);
}

export function resolveWorkTerms(work: WorkTermsInput, artist: ArtistTermsInput): ResolvedWorkTerms {
  const openToRevenueShare = work.openToRevenueShareOverride ?? artist.openToRevenueShare ?? true;
  const openToFreeLoan = work.openToFreeLoanOverride ?? artist.openToFreeLoan ?? true;
  const override = finiteOrNull(work.revenueShareOverride);
  const fees = openToFreeLoan ? listedFees(work) : [];
  return {
    openToRevenueShare,
    revenueSharePercent: openToRevenueShare ? (override ?? finiteOrNull(artist.revenueSharePercent) ?? 0) : 0,
    usesDefaultShare: override === null,
    openToFreeLoan,
    paidLoanFromGbp: fees.length > 0 ? Math.min(...fees) : null,
    paidLoanFeesVary: new Set(fees).size > 1,
    paidLoanMonthlyGbp: finiteOrNull(work.paidLoanMonthlyGbp),
  };
}

/**
 * The fee for one size. With no size chosen, or a label that names none of the
 * work's sizes, the lowest listed fee. A size that lists no fee returns null.
 */
export function paidLoanFeeForSize(work: WorkTermsInput, sizeLabel?: string | null): number | null {
  if (sizeLabel) {
    const size = (work.pricing ?? []).find((s) => s?.label === sizeLabel);
    if (size) {
      const fee = finiteOrNull(size.paidLoanMonthlyGbp);
      return fee !== null && fee > 0 ? fee : null;
    }
  }
  const fees = listedFees(work);
  return fees.length > 0 ? Math.min(...fees) : null;
}

/**
 * The work's own terms off a raw artist_works row, as GET /api/artist-works
 * returns it. A numeric string is tolerated so a type change upstream cannot
 * silently read a rate as absent. Leaves `pricing` to the caller, because the
 * profile transform spreads this over a work whose pricing it already keeps.
 */
export function workTermsFromRow(row: Record<string, unknown>): {
  revenueShareOverride: number | null;
  openToRevenueShareOverride: boolean | null;
  openToFreeLoanOverride: boolean | null;
  paidLoanMonthlyGbp: number | null;
} {
  return {
    revenueShareOverride: finiteOrNull(row.revenue_share_percent),
    openToRevenueShareOverride: booleanOrNull(row.open_to_revenue_share),
    openToFreeLoanOverride: booleanOrNull(row.open_to_free_loan),
    paidLoanMonthlyGbp: finiteOrNull(row.paid_loan_monthly_gbp),
  };
}

/** Each size's listed fee off a raw `pricing` value. Some rows name a size under `size`. */
export function loanFeeSizesFromRow(pricing: unknown): LoanFeeSize[] {
  if (!Array.isArray(pricing)) return [];
  return pricing
    .filter((size): size is Record<string, unknown> => !!size && typeof size === "object")
    .map((size) => ({
      label: typeof size.label === "string" ? size.label : typeof size.size === "string" ? size.size : "",
      paidLoanMonthlyGbp: finiteOrNull(size.paidLoanMonthlyGbp),
    }));
}

/** A raw row as a whole terms source, for the forms that hold raw rows. */
export function workTermsSourceFromRow(row: Record<string, unknown>): WorkTermsInput {
  return { ...workTermsFromRow(row), pricing: loanFeeSizesFromRow(row.pricing) };
}

export interface InitialPlacementTerms {
  /** Where the revenue share input starts, or null to keep the form's own default. */
  revenueSharePercent: number | null;
  /** Where the monthly fee input starts, or null to keep the form's own default. */
  monthlyFeeGbp: number | null;
  /** True when the selected works disagree, so the form should say so. */
  mixed: boolean;
}

export const MIXED_TERMS_NOTE =
  "These works list different terms. One revenue share and one monthly fee apply to the whole placement, so check the figures below.";

/**
 * Where a placement form's terms start for the selected works, first work first.
 *
 * A placement carries one rate and one fee for all its works, so the share is
 * the first open work's and the fee totals each open work's fee for its size.
 */
export function initialPlacementTerms(
  works: ReadonlyArray<PlacementSelection>,
  artist: ArtistTermsInput,
): InitialPlacementTerms {
  if (works.length === 0) return { revenueSharePercent: null, monthlyFeeGbp: null, mixed: false };

  const artistDefault = finiteOrNull(artist.revenueSharePercent);
  const resolved = works.map((w) => resolveWorkTerms(w, artist));
  const shareOf = (w: WorkTermsInput) => finiteOrNull(w.revenueShareOverride) ?? artistDefault;
  // A work not open to revenue share offers none, which differs from any rate.
  const shareKeys = works.map((w, i) => (resolved[i].openToRevenueShare ? `share:${shareOf(w)}` : "none"));

  const listed = works
    .map((w, i) => (resolved[i].openToFreeLoan ? paidLoanFeeForSize(w, w.sizeLabel) : null))
    .filter((fee): fee is number => fee !== null);
  const total = listed.length > 0 ? Math.round(listed.reduce((sum, fee) => sum + fee, 0) * 100) / 100 : null;

  const firstOpen = resolved.findIndex((r) => r.openToRevenueShare);
  return {
    revenueSharePercent: firstOpen >= 0 ? shareOf(works[firstOpen]) : null,
    monthlyFeeGbp: total,
    mixed: works.length > 1 && (new Set(shareKeys).size > 1 || (listed.length > 0 && listed.length < works.length)),
  };
}

export type WorkTermsFormResult =
  | { ok: true; revenueShareOverride: number | null; paidLoanMonthlyGbp: number | null }
  | { ok: false; error: string };

/** The work editor's two text inputs, checked against the same ranges as the database. */
export function parseWorkTermsForm(shareRaw: string, feeRaw: string): WorkTermsFormResult {
  const share = shareRaw.trim();
  const fee = feeRaw.trim();

  const shareVal = share === "" ? null : Number(share);
  if (shareVal !== null && (!Number.isInteger(shareVal) || shareVal < 0 || shareVal > 100)) {
    return { ok: false, error: "Revenue share must be a whole number from 0 to 100" };
  }

  const feeVal = fee === "" ? null : Number(fee);
  if (feeVal !== null && (!Number.isFinite(feeVal) || feeVal < PAID_LOAN_MIN_GBP || feeVal > 100_000)) {
    return { ok: false, error: `Monthly loan fees run from £${PAID_LOAN_MIN_GBP} to £100,000` };
  }

  return {
    ok: true,
    revenueShareOverride: shareVal,
    paidLoanMonthlyGbp: feeVal === null ? null : Math.round(feeVal * 100) / 100,
  };
}

/** "£40/month", or "£42.50/month": whole pounds drop the pence. */
export function formatMonthlyFee(fee: number): string {
  return `${gbp(fee)}/month`;
}

/** The same fee as a screen reader should say it. */
export function speakMonthlyFee(fee: number): string {
  return `${gbp(fee)} a month`;
}

export const REVENUE_SHARE_RATE_ERROR = "Enter a revenue share from 1 to 100";
export const LOAN_FEE_RANGE_ERROR = `Monthly loan fees run from £${PAID_LOAN_MIN_GBP} to £100,000`;

/** The profile values a work follows until it sets its own. */
export interface ProfileTerms {
  revenueSharePercent: number | null;
  openToRevenueShare: boolean;
  openToFreeLoan: boolean;
}

/** The work editor's arrangement inputs. Null means untouched, so the profile applies. */
export interface WorkArrangementsForm {
  revenueShareOffered: boolean | null;
  /** The rate box as typed, or null while it shows the profile rate. */
  revenueShareRate: string | null;
  paidLoanOffered: boolean | null;
  /** One entry per size row, as typed. */
  loanFees: string[];
}

export type WorkArrangementsResult =
  | {
      ok: true;
      openToRevenueShareOverride: boolean | null;
      openToFreeLoanOverride: boolean | null;
      revenueShareOverride: number | null;
      /** One entry per size row: the fee in pounds, or null for none. */
      loanFees: Array<number | null>;
    }
  | { ok: false; error: string };

/**
 * Check the editor's inputs and turn them into what the work stores: only what
 * differs from the profile, so untouched settings keep following it. A value
 * behind an unticked box is not checked, and an invalid fee there is dropped.
 */
export function parseWorkArrangements(form: WorkArrangementsForm, profile: ProfileTerms): WorkArrangementsResult {
  const shareOffered = form.revenueShareOffered ?? profile.openToRevenueShare;
  const loanOffered = form.paidLoanOffered ?? profile.openToFreeLoan;

  let revenueShareOverride: number | null = null;
  if (form.revenueShareRate !== null) {
    const raw = form.revenueShareRate.trim();
    const rate = raw === "" ? Number.NaN : Number(raw);
    const valid = Number.isInteger(rate) && rate >= 1 && rate <= 100;
    if (shareOffered && !valid) return { ok: false, error: REVENUE_SHARE_RATE_ERROR };
    if (valid && rate !== profile.revenueSharePercent) revenueShareOverride = rate;
  }

  const loanFees: Array<number | null> = [];
  for (const typed of form.loanFees) {
    const raw = typed.trim();
    const fee = raw === "" ? null : Number(raw);
    if (fee === null) {
      loanFees.push(null);
    } else if (Number.isFinite(fee) && fee >= PAID_LOAN_MIN_GBP && fee <= 100_000) {
      loanFees.push(Math.round(fee * 100) / 100);
    } else if (loanOffered) {
      return { ok: false, error: LOAN_FEE_RANGE_ERROR };
    } else {
      loanFees.push(null);
    }
  }

  const ownTick = (value: boolean | null, profileValue: boolean) =>
    value === null || value === profileValue ? null : value;

  return {
    ok: true,
    openToRevenueShareOverride: ownTick(form.revenueShareOffered, profile.openToRevenueShare),
    openToFreeLoanOverride: ownTick(form.paidLoanOffered, profile.openToFreeLoan),
    revenueShareOverride,
    loanFees,
  };
}
