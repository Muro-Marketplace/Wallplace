import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RETENTION_RULES, cutoffFor, describeRule } from "./retention";

const SCHEMA: Record<string, string[]> = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../tests/integration/schema-columns.json"), "utf8"),
);

describe("the retention schedule", () => {
  it("names only real tables and real timestamp columns", () => {
    // A rule against a phantom column is rejected whole by PostgREST, so the
    // job would report a failure per run forever, or worse, be quietly widened
    // by someone removing the filter to make it "work".
    for (const rule of RETENTION_RULES) {
      expect(SCHEMA[rule.table], `${rule.table} is not a table`).toBeDefined();
      expect(SCHEMA[rule.table], `${rule.table}.${rule.column}`).toContain(rule.column);
      if (rule.keepWhere) {
        expect(SCHEMA[rule.table], `${rule.table}.${rule.keepWhere.column}`).toContain(
          rule.keepWhere.column,
        );
      }
      if (rule.action.kind === "anonymise") {
        for (const col of Object.keys(rule.action.set)) {
          expect(SCHEMA[rule.table], `${rule.table}.${col}`).toContain(col);
        }
      }
    }
  });

  it("gives every rule a rationale, because the rationale IS the record", () => {
    // Article 5(2) accountability: the period is not the deliverable, the
    // reason for the period is.
    for (const rule of RETENTION_RULES) {
      expect(rule.rationale.length, `${rule.table} has no rationale`).toBeGreaterThan(60);
    }
  });

  it("keeps every period inside a defensible range", () => {
    for (const rule of RETENTION_RULES) {
      expect(rule.days, `${rule.table} expires too fast to be useful`).toBeGreaterThanOrEqual(30);
      expect(rule.days, `${rule.table} keeps data for over a decade`).toBeLessThanOrEqual(365 * 7);
    }
  });

  it("never touches a financial, safety or audit record", () => {
    // These are the tables a retention job must not reach: deleting them would
    // destroy tax records, Online Safety Act evidence, or an admin's own audit
    // trail. Listed here so adding one to the schedule fails loudly.
    const forbidden = [
      "orders",
      "refund_requests",
      "stripe_transfers",
      "placement_recurring_billings",
      "programme_rent_accruals",
      "admin_audit_log",
      "reports",
      "conversation_reports",
      "moderation_queue",
      "disputes",
      "messages",
    ];
    const scheduled = RETENTION_RULES.map((r) => r.table);
    for (const table of forbidden) {
      expect(scheduled, `${table} must never be aged out by the retention job`).not.toContain(table);
    }
  });

  it("keeps accepted applications out of the application purge", () => {
    // The purge is aimed at leads that went nowhere. An accepted applicant's
    // row is part of a live relationship.
    const rule = RETENTION_RULES.find((r) => r.table === "artist_applications");
    expect(rule?.keepWhere?.column).toBe("status");
    expect(rule?.keepWhere?.value).toEqual(expect.arrayContaining(["accepted"]));
  });

  it("anonymises the terms trail rather than deleting it", () => {
    // The acceptance is contractual evidence and survives. The IP address and
    // user agent around it do not.
    const rule = RETENTION_RULES.find((r) => r.table === "terms_acceptances");
    expect(rule?.action.kind).toBe("anonymise");
    if (rule?.action.kind === "anonymise") {
      expect(Object.keys(rule.action.set).sort()).toEqual(["ip_address", "user_agent"]);
    }
  });
});

describe("cutoffFor", () => {
  it("subtracts the rule's window from the clock", () => {
    const now = new Date("2026-09-10T00:00:00.000Z");
    const rule = { table: "t", column: "created_at", days: 30, action: { kind: "delete" as const }, rationale: "x" };
    expect(cutoffFor(rule, now)).toBe("2026-08-11T00:00:00.000Z");
  });
});

describe("describeRule", () => {
  it("renders a delete rule in months", () => {
    const rule = RETENTION_RULES.find((r) => r.table === "cart_sessions")!;
    expect(describeRule(rule)).toBe("cart_sessions: deleted 1 months after expires_at.");
  });

  it("renders an anonymise rule in years, naming the columns cleared", () => {
    const rule = RETENTION_RULES.find((r) => r.table === "terms_acceptances")!;
    expect(describeRule(rule)).toBe(
      "terms_acceptances: anonymised (ip_address, user_agent cleared) 7 years after accepted_at.",
    );
  });
});
