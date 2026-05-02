import { describe, expect, it } from "vitest";
import { COUNTRIES, regionForCountry, isSupportedCountry, type IsoCode } from "./iso-countries";

describe("COUNTRIES", () => {
  it("includes GB as the first option for UK-default checkout", () => {
    expect(COUNTRIES[0]).toEqual({ code: "GB", label: "United Kingdom" });
  });

  it("contains common EU markets", () => {
    const codes = COUNTRIES.map((c) => c.code);
    for (const expected of ["IE", "FR", "DE", "ES", "IT", "NL", "BE"]) {
      expect(codes).toContain(expected);
    }
  });

  it("contains US, CA, AU as international markets we explicitly support", () => {
    const codes = COUNTRIES.map((c) => c.code);
    for (const expected of ["US", "CA", "AU"]) {
      expect(codes).toContain(expected);
    }
  });

  it("uses unique 2-letter codes", () => {
    const seen = new Set<string>();
    for (const c of COUNTRIES) {
      expect(c.code.length).toBe(2);
      expect(seen.has(c.code)).toBe(false);
      seen.add(c.code);
    }
  });
});

describe("regionForCountry()", () => {
  it("returns 'uk' for GB", () => {
    expect(regionForCountry("GB")).toBe("uk");
  });

  it("returns 'international' for any non-GB supported country", () => {
    expect(regionForCountry("US")).toBe("international");
    expect(regionForCountry("FR")).toBe("international");
    expect(regionForCountry("IE")).toBe("international");
  });

  it("falls back to 'uk' for unknown codes (default-safe for UK-first marketplace)", () => {
    expect(regionForCountry("XX" as IsoCode)).toBe("uk");
  });
});

describe("isSupportedCountry()", () => {
  it("accepts any code in COUNTRIES", () => {
    expect(isSupportedCountry("GB")).toBe(true);
    expect(isSupportedCountry("US")).toBe(true);
  });

  it("rejects non-strings, lowercase, and unknown codes", () => {
    expect(isSupportedCountry("gb")).toBe(false);
    expect(isSupportedCountry("ZZ")).toBe(false);
    expect(isSupportedCountry(null)).toBe(false);
    expect(isSupportedCountry(undefined)).toBe(false);
    expect(isSupportedCountry(42)).toBe(false);
  });
});
