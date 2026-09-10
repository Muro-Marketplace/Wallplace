/**
 * The retention schedule, as data.
 *
 * UK compliance audit, 10 September 2026, finding DP-8. Nothing anywhere
 * deleted or anonymised anything on a schedule. Twelve crons run in
 * vercel.json and not one of them was a retention job, so `analytics_events`
 * grew without limit, `terms_acceptances` held IP addresses indefinitely, and
 * abandoned `cart_sessions` kept a buyer's name and delivery address past an
 * `expires_at` that nothing enforced.
 *
 * That is an Article 5(1)(e) problem on its own, and an Article 5(2) problem
 * on top of it: the Privacy Policy promised deletion within 90 days of account
 * closure and seven-year retention for transactions, and neither promise had
 * anything behind it. A policy you cannot evidence is worse than no policy,
 * because it is a statement you have made to every data subject.
 *
 * The rules live here rather than in the cron so that docs/compliance/
 * retention-schedule.md and the code cannot drift: the document is generated
 * from this list, and a test asserts they match.
 *
 * Per the data invariant in AGENTS.md, this is enforced by a cron listed in
 * vercel.json. Never by a manual admin endpoint, which would be stale by
 * construction.
 */

export type RetentionAction =
  | { kind: "delete" }
  | { kind: "anonymise"; set: Record<string, unknown> };

export interface RetentionRule {
  /** Table the rule applies to. */
  table: string;
  /** Timestamp column the age is measured from. */
  column: string;
  /** How long a row may live, in days. */
  days: number;
  action: RetentionAction;
  /** Why this period, in one sentence. This is the accountability record. */
  rationale: string;
  /**
   * Rows this rule must never touch, as a PostgREST filter applied on top of
   * the age filter. Used where a table mixes retained and expiring rows.
   */
  keepWhere?: { column: string; op: "not_in" | "is"; value: unknown };
}

/** Days, named so the table below reads as a policy rather than arithmetic. */
const MONTHS = (n: number) => Math.round(n * 30.44);
const YEARS = (n: number) => n * 365;

export const RETENTION_RULES: readonly RetentionRule[] = [
  {
    table: "analytics_events",
    column: "created_at",
    days: MONTHS(24),
    action: { kind: "delete" },
    rationale:
      "Artist and venue analytics are useful for year-on-year comparison and stop being useful after that. The visitor id is a daily-rotating hash, so a row older than a day cannot be linked to a person anyway; this is about not keeping a behavioural record with no purpose left.",
  },
  {
    table: "cart_sessions",
    column: "expires_at",
    days: 30,
    action: { kind: "delete" },
    rationale:
      "An abandoned checkout holds the buyer's name, delivery address and email in `shipping`. The row already carries an expires_at that nothing enforced. A month past expiry is long enough to reconcile a late Stripe webhook and no longer.",
  },
  {
    table: "email_events",
    column: "created_at",
    days: MONTHS(24),
    action: { kind: "delete" },
    rationale:
      "The send log holds a recipient address per row. Two years covers deliverability investigation and any 'did you email me' question, which is the only reason to keep it.",
  },
  {
    table: "waitlist_signups",
    column: "created_at",
    days: MONTHS(18),
    action: { kind: "delete" },
    rationale:
      "A pre-launch expression of interest that has not converted in eighteen months is not a live relationship, and the lawful basis for holding it has run out with it.",
  },
  {
    table: "contact_submissions",
    column: "created_at",
    days: MONTHS(24),
    action: { kind: "delete" },
    rationale:
      "Support correspondence, kept long enough to show a pattern of complaint handling and to answer a follow-up, then gone.",
  },
  {
    table: "enquiries",
    column: "created_at",
    days: MONTHS(24),
    action: { kind: "delete" },
    rationale:
      "An enquiry that did not become a placement or an order is a lead, and a two-year-old lead is a record with no purpose.",
  },
  {
    table: "artist_applications",
    column: "created_at",
    days: MONTHS(12),
    action: { kind: "delete" },
    rationale:
      "A rejected or abandoned application holds a name, an email, a location, social handles and a personal statement. Twelve months covers a re-application and an appeal. Accepted applicants have an artist_profiles row, which is the live record; this only reaches the ones that went nowhere.",
    keepWhere: { column: "status", op: "not_in", value: ["accepted", "approved"] },
  },
  {
    table: "venue_registrations",
    column: "created_at",
    days: MONTHS(12),
    action: { kind: "delete" },
    rationale:
      "Same reasoning as artist applications: a registration that never became a venue_profiles row is an unconverted lead holding a contact name, phone number and postal address.",
  },
  {
    table: "terms_acceptances",
    column: "accepted_at",
    days: YEARS(7),
    action: { kind: "anonymise", set: { ip_address: null, user_agent: null } },
    rationale:
      "The acceptance itself is contractual evidence and is kept for the six-year limitation period plus a margin. The IP address and user agent are the anti-repudiation detail around it, and they stop being worth holding once the limitation period has run. The row survives; the identifiers do not.",
  },
] as const;

/** The cut-off instant for a rule, given a clock. */
export function cutoffFor(rule: RetentionRule, now: Date): string {
  return new Date(now.getTime() - rule.days * 24 * 60 * 60 * 1000).toISOString();
}

/** Human summary of a rule, used by the generated schedule document. */
export function describeRule(rule: RetentionRule): string {
  const period =
    rule.days % 365 === 0
      ? `${rule.days / 365} year${rule.days === 365 ? "" : "s"}`
      : `${Math.round(rule.days / 30.44)} months`;
  const what =
    rule.action.kind === "delete"
      ? "deleted"
      : `anonymised (${Object.keys(rule.action.set).join(", ")} cleared)`;
  return `${rule.table}: ${what} ${period} after ${rule.column}.`;
}
