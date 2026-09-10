import { describe, it, expect } from "vitest";
import { REPORT_REASONS, URGENT_REPORT_REASONS, isUrgentReportReason } from "./validations";

// UK compliance audit, finding OSA-1.
//
// The taxonomy was not_the_artists_own_work, offensive_or_explicit,
// misleading_or_scam, spam, impersonation, other. Every one of those protects
// the marketplace. None of them names illegal content, so a reporting
// mechanism that the Online Safety Act ss.20-21 requires could not be
// evidenced, and a user reporting the most serious thing they will ever tell
// us had to pick "Something else".
//
// These assertions are the ratchet on that: the categories may be reworded,
// but the classes of illegal harm cannot quietly disappear from the picker.

describe("the report taxonomy covers illegal content", () => {
  it("offers a category for each priority class of illegal harm", () => {
    for (const reason of [
      "harassment_or_threats",
      "hate_or_discrimination",
      "illegal_sexual_content",
      "child_safety",
      "self_harm_or_suicide",
      "fraud_or_illegal_goods",
      "terrorism_or_extremism",
    ]) {
      expect(REPORT_REASONS as readonly string[], `${reason} is not reportable`).toContain(reason);
    }
  });

  it("keeps the platform-integrity categories that were already there", () => {
    // Widening the taxonomy must not cost a reporter the ability to say
    // "this is not the artist's own work", which is the copyright route.
    for (const reason of ["not_the_artists_own_work", "impersonation", "spam", "other"]) {
      expect(REPORT_REASONS as readonly string[]).toContain(reason);
    }
  });

  it("marks the categories that must jump the queue", () => {
    for (const reason of URGENT_REPORT_REASONS) {
      expect(isUrgentReportReason(reason)).toBe(true);
      expect(REPORT_REASONS as readonly string[], `${reason} is urgent but not offerable`).toContain(
        reason,
      );
    }
  });

  it("does not treat a marketplace complaint as urgent", () => {
    // Urgency is about the duty to act swiftly on illegal content. Marking
    // everything urgent would mean nothing is.
    for (const reason of ["spam", "not_the_artists_own_work", "other", "misleading_or_scam"]) {
      expect(isUrgentReportReason(reason)).toBe(false);
    }
  });

  it("does not treat an unknown string as urgent", () => {
    expect(isUrgentReportReason("")).toBe(false);
    expect(isUrgentReportReason("URGENT")).toBe(false);
  });

  it("keeps `other` last, so it reads as the fallback it is", () => {
    expect(REPORT_REASONS[REPORT_REASONS.length - 1]).toBe("other");
  });
});
