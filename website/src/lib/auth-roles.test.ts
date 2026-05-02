import { describe, expect, it } from "vitest";
import { ALLOWED_ROLES, isRole, parseRole, portalPathForRole, type UserRole } from "./auth-roles";

describe("ALLOWED_ROLES", () => {
  it("contains exactly the four supported roles", () => {
    expect(ALLOWED_ROLES).toEqual(["artist", "venue", "customer", "admin"]);
  });
});

describe("isRole()", () => {
  it("accepts every allowed role", () => {
    for (const r of ALLOWED_ROLES) {
      expect(isRole(r)).toBe(true);
    }
  });

  it.each([null, undefined, "", "ARTIST", "owner", 42, {}, [], true])(
    "rejects %p",
    (input) => {
      expect(isRole(input)).toBe(false);
    },
  );
});

describe("parseRole()", () => {
  it("returns the role when valid", () => {
    expect(parseRole("artist")).toBe<UserRole>("artist");
  });

  it("returns null for unknown values rather than throwing", () => {
    expect(parseRole("hacker")).toBeNull();
    expect(parseRole(undefined)).toBeNull();
    expect(parseRole(123)).toBeNull();
  });
});

describe("portalPathForRole()", () => {
  it.each([
    ["admin", "/admin"],
    ["venue", "/venue-portal"],
    ["customer", "/customer-portal"],
    ["artist", "/artist-portal"],
  ] as const)("%s -> %s", (role, path) => {
    expect(portalPathForRole(role)).toBe(path);
  });

  it("falls back to /browse for null", () => {
    expect(portalPathForRole(null)).toBe("/browse");
  });
});
