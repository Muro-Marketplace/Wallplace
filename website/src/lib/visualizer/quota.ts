/**
 * Wall Visualizer — quota service.
 *
 * The single chokepoint that decides whether an expensive visualizer
 * action (render, wall upload, showroom publish) is allowed for a user.
 * Every API route that performs a billable action MUST go through
 * `consumeQuota()` before doing the work, and `refundQuota()` if the
 * underlying action fails.
 *
 * Architecture:
 *   - Per-user, per-day + per-month limits resolved from `tier-limits.ts`.
 *   - Per-user upstash sliding-window burst limit (30/hour) on top, so a
 *     single account can't burn through a whole day's daily allowance in
 *     30 seconds even if their tier permits it.
 *   - `visualizer_usage` is an append-only ledger. Consumption is a positive
 *     row; refund is a negative row referencing the original. Computing
 *     "remaining" is `tier_limit - SUM(cost_units WHERE today)`.
 *   - Per-user override row in `visualizer_quota_overrides` adds extra
 *     capacity (support tool — comp accounts, demo grants).
 *
 * Race-condition pragmatics:
 *   Read-then-insert is not atomic. Two concurrent calls both passing the
 *   limit check could both insert and exceed the cap by 1. We intentionally
 *   accept that small leak — quota is a soft cap, the burst limiter catches
 *   abuse, and the alternative (advisory locks per user) is much heavier.
 *   The audit trail makes after-the-fact reconciliation trivial.
 *
 * Time zones:
 *   All buckets are UTC. Daily reset is 00:00 UTC, monthly is 1st of next
 *   month UTC. This matches the spec (§F3) and avoids per-user TZ logic.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ACTION_COSTS, getTierLimits } from "./tier-limits";
import { resolveTier } from "./tier-resolver";
import type {
  QuotaConsumeResult,
  QuotaStatus,
  TierLimits,
  VisualizerAction,
  VisualizerTier,
  WallOwnerType,
} from "./types";

// ── Time helpers ────────────────────────────────────────────────────────

/** YYYY-MM-DD in UTC. */
export function dayBucketUTC(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM in UTC. */
export function monthBucketUTC(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7);
}

/** Next 00:00 UTC after `d`. */
export function nextDailyResetUTC(d: Date = new Date()): Date {
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0),
  );
  return next;
}

/** First of next month, 00:00 UTC. */
export function nextMonthlyResetUTC(d: Date = new Date()): Date {
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return next;
}

// ── Override row ────────────────────────────────────────────────────────

interface OverrideRow {
  user_id: string;
  daily_extra: number;
  monthly_extra: number;
  expires_at: string | null;
}

async function readOverride(
  db: SupabaseClient,
  userId: string,
  now: Date,
): Promise<{ daily_extra: number; monthly_extra: number; active: boolean }> {
  try {
    const { data, error } = await db
      .from("visualizer_quota_overrides")
      .select("user_id, daily_extra, monthly_extra, expires_at")
      .eq("user_id", userId)
      .maybeSingle<OverrideRow>();
    if (error || !data) return { daily_extra: 0, monthly_extra: 0, active: false };
    const expired = data.expires_at !== null && new Date(data.expires_at).getTime() <= now.getTime();
    if (expired) return { daily_extra: 0, monthly_extra: 0, active: false };
    return {
      daily_extra: data.daily_extra,
      monthly_extra: data.monthly_extra,
      active: data.daily_extra > 0 || data.monthly_extra > 0,
    };
  } catch {
    return { daily_extra: 0, monthly_extra: 0, active: false };
  }
}

// ── Usage sums ──────────────────────────────────────────────────────────

/**
 * Sum of `cost_units` for the user in the given window. Refunds are
 * stored as negative rows so the same SUM() works for both buckets.
 */
async function sumUsage(
  db: SupabaseClient,
  userId: string,
  bucketField: "day_bucket" | "month_bucket",
  bucketValue: string,
): Promise<number> {
  try {
    const { data, error } = await db
      .from("visualizer_usage")
      .select("cost_units")
      .eq("user_id", userId)
      .eq(bucketField, bucketValue);
    if (error || !data) return 0;
    let total = 0;
    for (const row of data as Array<{ cost_units: number }>) total += row.cost_units;
    // Clamp to >= 0 — if refunds outpace charges (shouldn't happen) we
    // don't want to gift extra quota.
    return Math.max(0, total);
  } catch {
    return 0;
  }
}

// ── Public API ──────────────────────────────────────────────────────────

export interface ConsumeQuotaInput {
  userId: string;
  action: VisualizerAction;
  /** Override the standard cost (defaults to ACTION_COSTS[action]). */
  units?: number;
  /** Hint for tier resolution (which portal is the user on). */
  ownerTypeHint?: WallOwnerType;
  /** Optional reference (e.g. layout_id) — recorded on the ledger row. */
  referenceId?: string;
  /** Optional metadata blob for the ledger row. */
  metadata?: Record<string, unknown>;
}

export interface ConsumeQuotaDeps {
  db?: SupabaseClient;
  /** Burst-limit check. Override in tests. Returns null = OK, Response = 429. */
  burstCheck?: (userId: string) => Promise<Response | null>;
  /** Clock injection for deterministic tests. */
  now?: () => Date;
}

const DEFAULT_BURST_LIMIT = {
  name: "visualizer_render_burst",
  limit: 30,
  windowSeconds: 3600,
};

async function defaultBurstCheck(userId: string): Promise<Response | null> {
  // withRateLimit needs a Request to read IP off; for per-user burst we
  // pass an explicit key and a stub request. The rate-limit module's
  // helper accepts an explicit `key` which short-circuits IP extraction.
  const fakeReq = new Request("https://wallplace.local/quota");
  const blocked = await withRateLimit(fakeReq, {
    name: DEFAULT_BURST_LIMIT.name,
    limit: DEFAULT_BURST_LIMIT.limit,
    windowSeconds: DEFAULT_BURST_LIMIT.windowSeconds,
    key: userId,
  });
  return blocked;
}

/**
 * Atomically (within a small leak — see header) check tier + override +
 * burst limits for `userId` performing `action`. If allowed, insert a
 * ledger row and return ok with remaining counts. If blocked, return the
 * reason without recording usage.
 */
export async function consumeQuota(
  input: ConsumeQuotaInput,
  deps: ConsumeQuotaDeps = {},
): Promise<QuotaConsumeResult> {
  const db = deps.db ?? getSupabaseAdmin();
  const now = deps.now ? deps.now() : new Date();
  const units = input.units ?? ACTION_COSTS[input.action] ?? 1;

  if (units < 0) {
    throw new Error(
      "Use refundQuota() for negative units — consumeQuota only accepts positive costs.",
    );
  }

  const tier = await resolveTier(
    { userId: input.userId, ownerTypeHint: input.ownerTypeHint },
    db,
  );
  const limits = getTierLimits(tier);

  // Burst limit applies to expensive actions only — wall_upload + render*.
  // showroom_publish is rare enough that we skip burst on it.
  const burstApplicable =
    input.action === "render_standard" ||
    input.action === "render_hd" ||
    input.action === "wall_upload";
  if (burstApplicable) {
    const burst = deps.burstCheck ?? defaultBurstCheck;
    const blocked = await burst(input.userId);
    if (blocked) {
      return {
        ok: false,
        reason: "burst",
        // Burst window is 1 hour — soft retry guidance.
        resets_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        tier,
      };
    }
  }

  const dayBucket = dayBucketUTC(now);
  const monthBucket = monthBucketUTC(now);

  const [override, dailyUsed, monthlyUsed] = await Promise.all([
    readOverride(db, input.userId, now),
    sumUsage(db, input.userId, "day_bucket", dayBucket),
    sumUsage(db, input.userId, "month_bucket", monthBucket),
  ]);

  const effectiveDaily = limits.daily + override.daily_extra;
  const effectiveMonthly = limits.monthly + override.monthly_extra;

  if (dailyUsed + units > effectiveDaily) {
    return {
      ok: false,
      reason: "daily",
      resets_at: nextDailyResetUTC(now).toISOString(),
      tier,
    };
  }
  if (monthlyUsed + units > effectiveMonthly) {
    return {
      ok: false,
      reason: "monthly",
      resets_at: nextMonthlyResetUTC(now).toISOString(),
      tier,
    };
  }

  // All clear — record consumption.
  const { error } = await db.from("visualizer_usage").insert({
    user_id: input.userId,
    action: input.action,
    cost_units: units,
    day_bucket: dayBucket,
    month_bucket: monthBucket,
    reference_id: input.referenceId ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    // Insert failed (DB hiccup, RLS misconfig). Fail closed — surface as a
    // generic block. Never silently let the action through without a ledger
    // row, otherwise the user gets a free render.
    console.error("[visualizer] failed to record usage:", error.message);
    return {
      ok: false,
      reason: "daily",
      resets_at: nextDailyResetUTC(now).toISOString(),
      tier,
    };
  }

  return {
    ok: true,
    remaining_daily: Math.max(0, effectiveDaily - dailyUsed - units),
    remaining_monthly: Math.max(0, effectiveMonthly - monthlyUsed - units),
  };
}

// ── Refund ──────────────────────────────────────────────────────────────

export interface RefundQuotaInput {
  userId: string;
  /** What the original action was — drives the negative cost amount. */
  originalAction: VisualizerAction;
  /** The reference of the row being refunded (e.g. failed render id). */
  referenceId?: string;
  /** Override the auto-calculated refund amount. */
  units?: number;
  reason?: string;
}

export interface RefundQuotaDeps {
  db?: SupabaseClient;
  now?: () => Date;
}

/**
 * Insert a negative ledger row to refund a previously-consumed quota unit.
 * Idempotency is the caller's responsibility — pass the original
 * `referenceId` so duplicate refunds can be detected in support audits.
 */
export async function refundQuota(
  input: RefundQuotaInput,
  deps: RefundQuotaDeps = {},
): Promise<{ ok: boolean; error?: string }> {
  const db = deps.db ?? getSupabaseAdmin();
  const now = deps.now ? deps.now() : new Date();
  const units = input.units ?? ACTION_COSTS[input.originalAction] ?? 1;

  if (units <= 0) {
    return { ok: false, error: "Refund units must be positive" };
  }

  const { error } = await db.from("visualizer_usage").insert({
    user_id: input.userId,
    action: "refund",
    cost_units: -units,
    day_bucket: dayBucketUTC(now),
    month_bucket: monthBucketUTC(now),
    reference_id: input.referenceId ?? null,
    metadata: input.reason
      ? { reason: input.reason, original_action: input.originalAction }
      : { original_action: input.originalAction },
  });

  if (error) {
    console.error("[visualizer] refund insert failed:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ── Status ──────────────────────────────────────────────────────────────

export interface QuotaStatusInput {
  userId: string | null | undefined;
  ownerTypeHint?: WallOwnerType;
}

export interface QuotaStatusDeps {
  db?: SupabaseClient;
  now?: () => Date;
}

/**
 * Read-only quota state for the editor's quota chip and the upgrade UX.
 */
export async function getQuotaStatus(
  input: QuotaStatusInput,
  deps: QuotaStatusDeps = {},
): Promise<QuotaStatus> {
  const db = deps.db ?? getSupabaseAdmin();
  const now = deps.now ? deps.now() : new Date();
  const userId = (input.userId ?? "").trim();

  const tier = await resolveTier(
    { userId: userId || null, ownerTypeHint: input.ownerTypeHint },
    db,
  );
  const limits: TierLimits = getTierLimits(tier);

  if (!userId) {
    // Guest user — return a synthetic empty-status with zero everything.
    return {
      tier,
      limits,
      daily_used: 0,
      monthly_used: 0,
      daily_remaining: 0,
      monthly_remaining: 0,
      daily_resets_at: nextDailyResetUTC(now).toISOString(),
      monthly_resets_at: nextMonthlyResetUTC(now).toISOString(),
      override_active: false,
    };
  }

  const [override, dailyUsed, monthlyUsed] = await Promise.all([
    readOverride(db, userId, now),
    sumUsage(db, userId, "day_bucket", dayBucketUTC(now)),
    sumUsage(db, userId, "month_bucket", monthBucketUTC(now)),
  ]);

  const effectiveDaily = limits.daily + override.daily_extra;
  const effectiveMonthly = limits.monthly + override.monthly_extra;

  return {
    tier,
    limits,
    daily_used: dailyUsed,
    monthly_used: monthlyUsed,
    daily_remaining: Math.max(0, effectiveDaily - dailyUsed),
    monthly_remaining: Math.max(0, effectiveMonthly - monthlyUsed),
    daily_resets_at: nextDailyResetUTC(now).toISOString(),
    monthly_resets_at: nextMonthlyResetUTC(now).toISOString(),
    override_active: override.active,
  };
}

// ── Re-exports for callers ──────────────────────────────────────────────

export type { QuotaStatus, QuotaConsumeResult, VisualizerAction, VisualizerTier };
