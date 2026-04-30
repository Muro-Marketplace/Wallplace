// src/lib/auth-roles.ts
//
// Single source of truth for the four user roles Wallplace supports.
// Every place that reads `user_metadata.user_type` MUST go through
// parseRole() so a corrupt / unexpected value never propagates.

export const ALLOWED_ROLES = ["artist", "venue", "customer", "admin"] as const;

export type UserRole = (typeof ALLOWED_ROLES)[number];

export function isRole(value: unknown): value is UserRole {
  return typeof value === "string" && (ALLOWED_ROLES as readonly string[]).includes(value);
}

export function parseRole(value: unknown): UserRole | null {
  return isRole(value) ? value : null;
}

/**
 * The portal path a user lands on after a successful auth event.
 * Centralised so login and signup pages stay in sync.
 */
export function portalPathForRole(role: UserRole | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "venue":
      return "/venue-portal";
    case "customer":
      return "/customer-portal";
    case "artist":
      return "/artist-portal";
    default:
      return "/browse";
  }
}
