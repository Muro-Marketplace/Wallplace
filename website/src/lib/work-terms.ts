/**
 * A work's own terms: the revenue share it offers a venue, and the monthly fee
 * to take it on paid loan.
 *
 * Spec: docs/superpowers/specs/2026-09-13-per-artwork-terms-design.md.
 *
 * Both are optional per work. A work with no share of its own uses the artist's
 * profile default. A work with no listed fee shows no price and is still offered
 * for paid loan exactly as before.
 *
 * AGENTS.md: a derived value is computed in one exported function. Every
 * surface that shows or starts from a work's terms reads them through here.
 */

import { gbp } from "@/lib/curation-tiers";
import { PAID_LOAN_MIN_GBP } from "@/lib/pricing";

export interface WorkTermsInput {
  /** The work's own share, or null / undefined when it uses the default. */
  revenueShareOverride?: number | null;
  /** The work's listed monthly paid loan fee in pounds, or null / undefined for none. */
  paidLoanMonthlyGbp?: number | null;
}

export interface ArtistTermsInput {
  revenueSharePercent?: number | null;
}

/** What GET /api/artist-works returns beside the works. */
export interface ArtistTermsPayload {
  revenueSharePercent: number | null;
  openToRevenueShare: boolean;
  openToFreeLoan: boolean;
}

export interface ResolvedWorkTerms {
  revenueSharePercent: number;
  usesDefaultShare: boolean;
  paidLoanMonthlyGbp: number | null;
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function resolveWorkTerms(work: WorkTermsInput, artist: ArtistTermsInput): ResolvedWorkTerms {
  const override = finiteOrNull(work.revenueShareOverride);
  return {
    revenueSharePercent: override ?? finiteOrNull(artist.revenueSharePercent) ?? 0,
    usesDefaultShare: override === null,
    paidLoanMonthlyGbp: finiteOrNull(work.paidLoanMonthlyGbp),
  };
}

/**
 * The two columns off a raw artist_works row, as GET /api/artist-works returns
 * it. PostgREST sends `numeric` as a JSON number; a string is tolerated so a
 * precision change upstream cannot silently read a fee as absent.
 */
export function workTermsFromRow(row: Record<string, unknown>): {
  revenueShareOverride: number | null;
  paidLoanMonthlyGbp: number | null;
} {
  return {
    revenueShareOverride: finiteOrNull(row.revenue_share_percent),
    paidLoanMonthlyGbp: finiteOrNull(row.paid_loan_monthly_gbp),
  };
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
 * the first work's and the fee is the total of the listed fees.
 */
export function initialPlacementTerms(works: WorkTermsInput[], artist: ArtistTermsInput): InitialPlacementTerms {
  if (works.length === 0) return { revenueSharePercent: null, monthlyFeeGbp: null, mixed: false };

  const artistDefault = finiteOrNull(artist.revenueSharePercent);
  const shareOf = (w: WorkTermsInput) => finiteOrNull(w.revenueShareOverride) ?? artistDefault;

  const fees = works.map((w) => finiteOrNull(w.paidLoanMonthlyGbp)).filter((f): f is number => f !== null);
  const total = fees.length > 0 ? Math.round(fees.reduce((sum, f) => sum + f, 0) * 100) / 100 : null;

  const distinctShares = new Set(works.map(shareOf)).size;
  const someButNotAllFees = fees.length > 0 && fees.length < works.length;

  return {
    revenueSharePercent: shareOf(works[0]),
    monthlyFeeGbp: total,
    mixed: works.length > 1 && (distinctShares > 1 || someButNotAllFees),
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
