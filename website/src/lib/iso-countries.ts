// ISO 3166-1 alpha-2 codes for the countries Wallplace ships to.
// Single source of truth — checkout page, /api/checkout, and shipping
// region detection all read from here.
//
// "uk" vs "international" is a shipping-cost concept, not a customs
// concept. GB is the only "uk" code; everything else is "international".
// Unknown codes fall back to "uk" so a typo can't accidentally trigger
// international shipping rates (which are higher).

export interface Country {
  code: string;
  label: string;
}

export const COUNTRIES: readonly Country[] = [
  { code: "GB", label: "United Kingdom" },
  { code: "IE", label: "Ireland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "PT", label: "Portugal" },
  { code: "AT", label: "Austria" },
  { code: "DK", label: "Denmark" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "FI", label: "Finland" },
  { code: "CH", label: "Switzerland" },
  { code: "PL", label: "Poland" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
] as const;

export type IsoCode = (typeof COUNTRIES)[number]["code"];

export function isSupportedCountry(value: unknown): value is IsoCode {
  if (typeof value !== "string") return false;
  return COUNTRIES.some((c) => c.code === value);
}

export function regionForCountry(code: string | null | undefined): "uk" | "international" {
  if (code === "GB") return "uk";
  if (isSupportedCountry(code)) return "international";
  return "uk";
}

export function labelForCountry(code: string): string {
  const c = COUNTRIES.find((c) => c.code === code);
  return c ? c.label : code;
}
