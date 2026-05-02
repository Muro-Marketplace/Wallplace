// src/lib/safe-redirect.ts
//
// Validate user-supplied "?next=" / "?redirect=" values before passing
// them to router.replace() or window.location. The rule is intentionally
// strict: must start with a single forward slash, must not start with
// "//" (protocol-relative), must not contain a colon (blocks
// javascript:, data:, etc.), and must not contain a backslash (blocks
// "/\evil.com" tricks that some browsers treat as a hostname).

const REJECTED_SUBSTRINGS = [":", "\\"] as const;

export function safeRedirect(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  if (value.length === 0) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  for (const bad of REJECTED_SUBSTRINGS) {
    if (value.includes(bad)) return fallback;
  }
  return value;
}
