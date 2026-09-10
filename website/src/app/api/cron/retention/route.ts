/**
 * /api/cron/retention
 *
 * Vercel Cron, daily 03:00 UTC. Enforces the retention schedule in
 * src/lib/retention.ts: deletes or anonymises rows that have outlived the
 * purpose they were collected for.
 *
 * UK compliance audit, 10 September 2026, finding DP-8. Before this, nothing
 * anywhere deleted anything on a schedule. Twelve crons ran and not one of
 * them was a retention job, so `analytics_events` grew without limit, an
 * abandoned `cart_sessions` row kept a buyer's name and delivery address past
 * an `expires_at` that nothing enforced, and `terms_acceptances` held IP
 * addresses indefinitely. The Privacy Policy meanwhile promised deletion
 * within 90 days and seven-year transaction retention, with nothing behind
 * either promise.
 *
 * A cron rather than an admin button, per the data invariant in AGENTS.md: a
 * retention pass that runs when a human remembers is stale by construction,
 * and the whole value of the schedule is that it runs whether anyone is
 * watching or not.
 *
 * Failure policy matches the other crons. One rule failing is a bad query or a
 * poisoned table, not a broken job, so it is counted and the run continues.
 * Every rule failing is the job being broken and returns 500, which is what
 * Vercel's monitor and the all-failed admin alert key off.
 *
 * Deliberately NOT deleted by this job, and each for a reason:
 *   orders, refund_requests,        financial records. HMRC expects six years
 *   stripe_transfers                from the end of the accounting period; the
 *                                   Privacy Policy says seven and that is the
 *                                   promise that binds.
 *   admin_audit_log                 the record of what an admin did. A
 *                                   retention job that trimmed it would be a
 *                                   retention job that erased evidence.
 *   reports, moderation_queue,      Online Safety Act records. Ofcom expects a
 *   conversation_reports, disputes  provider to be able to show what it was
 *                                   told and what it did about it.
 *   messages                        conversation history is the contractual
 *                                   record of a negotiation between two users
 *                                   and neither party alone should age it out.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { RETENTION_RULES, cutoffFor, type RetentionRule } from "@/lib/retention";
import { requireCronAuth, finishCronRun } from "../_auth";

export const dynamic = "force-dynamic";

interface RuleOutcome {
  table: string;
  action: "delete" | "anonymise";
  cutoff: string;
  affected: number;
  error?: string;
}

export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const db = getSupabaseAdmin();
  const now = new Date();
  const outcomes: RuleOutcome[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const rule of RETENTION_RULES) {
    const cutoff = cutoffFor(rule, now);
    try {
      const affected = await applyRule(db, rule, cutoff);
      outcomes.push({ table: rule.table, action: rule.action.kind, cutoff, affected });
      succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/retention] ${rule.table} failed:`, message);
      outcomes.push({
        table: rule.table,
        action: rule.action.kind,
        cutoff,
        affected: 0,
        error: message,
      });
      failed++;
    }
  }

  return finishCronRun("retention", { succeeded, failed }, {
    ranAt: now.toISOString(),
    rules: outcomes,
  });
}

async function applyRule(
  db: ReturnType<typeof getSupabaseAdmin>,
  rule: RetentionRule,
  cutoff: string,
): Promise<number> {
  // `count: "exact"` on the write is what makes the run auditable: the
  // response says how many rows each rule actually reached, so a rule that has
  // quietly stopped matching anything is visible rather than indistinguishable
  // from a rule with nothing to do.
  let query =
    rule.action.kind === "delete"
      ? db.from(rule.table).delete({ count: "exact" })
      : db.from(rule.table).update(rule.action.set, { count: "exact" });

  query = query.lt(rule.column, cutoff);

  if (rule.keepWhere) {
    if (rule.keepWhere.op === "not_in") {
      query = query.not(
        rule.keepWhere.column,
        "in",
        `(${(rule.keepWhere.value as string[]).map((v) => `"${v}"`).join(",")})`,
      );
    } else {
      query = query.is(rule.keepWhere.column, rule.keepWhere.value as null);
    }
  }

  // An anonymise rule must not keep re-writing rows it already cleared, or the
  // count is meaningless and the job does work forever. Only touch rows that
  // still carry something.
  if (rule.action.kind === "anonymise") {
    const firstKey = Object.keys(rule.action.set)[0];
    if (firstKey) query = query.not(firstKey, "is", null);
  }

  const { error, count } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// GET only, like every other cron here. A manual run is
//   curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/retention
// as api/cron/_auth.ts documents. A POST handler would add a mutating surface
// that the require-authz-on-mutation ratchet would rightly flag, for no gain.

export const runtime = "nodejs";
