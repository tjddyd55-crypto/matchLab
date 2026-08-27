import "server-only";

/**
 * MATCHON SaaS billing feature flags.
 * Mirrors insurance CRM ENABLED vs ENFORCE separation.
 */
export function isBillingEnforceAccessEnabled(): boolean {
  const raw = String(process.env.MATCHON_BILLING_ENFORCE_ACCESS ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Roles that must hold a platform subscription to use the dashboard. */
export const BILLING_REQUIRED_ROLES = ["gym", "organizer"] as const;

export type BillingRequiredRole = (typeof BILLING_REQUIRED_ROLES)[number];

export function roleRequiresBilling(role: string): role is BillingRequiredRole {
  return (BILLING_REQUIRED_ROLES as readonly string[]).includes(role);
}

/** Routes that remain reachable without entitlement. */
export function isBillingAllowlistedPath(pathname: string): boolean {
  const p = pathname.split("?")[0] || "/";
  if (p.startsWith("/billing")) return true;
  if (p.startsWith("/login")) return true;
  if (p.startsWith("/api/billing")) return true;
  if (p === "/logout" || p.startsWith("/auth")) return true;
  if (p.startsWith("/notifications")) return true;
  return false;
}
