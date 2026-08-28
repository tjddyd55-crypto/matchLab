import "server-only";

/**
 * MATCHON SaaS billing feature flags.
 */

export function isBillingEnforceAccessEnabled(): boolean {
  const raw = String(process.env.MATCHON_BILLING_ENFORCE_ACCESS ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** FREE_MONTHS도 결제수단(Toss Billing) 등록을 요구할지. 기본 false = Phase1 유지. */
export function isBillingRequirePaymentMethodForTrial(): boolean {
  const raw = String(
    process.env.MATCHON_BILLING_REQUIRE_PM_FOR_TRIAL ?? "",
  )
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getBillingProviderName(): "none" | "toss" {
  const name = String(process.env.MATCHON_BILLING_PROVIDER ?? "none")
    .trim()
    .toLowerCase();
  return name === "toss" ? "toss" : "none";
}

/** Roles that pay for MATCHON SaaS: gym owner + organizer (association included). */
export const BILLING_REQUIRED_ROLES = ["gym", "organizer"] as const;

export type BillingRequiredRole = (typeof BILLING_REQUIRED_ROLES)[number];

export function roleRequiresBilling(role: string): role is BillingRequiredRole {
  return (BILLING_REQUIRED_ROLES as readonly string[]).includes(role);
}

export function isBillingAllowlistedPath(pathname: string): boolean {
  const p = pathname.split("?")[0] || "/";
  if (p.startsWith("/billing")) return true;
  if (p.startsWith("/login")) return true;
  if (p.startsWith("/api/billing")) return true;
  if (p === "/logout" || p.startsWith("/auth")) return true;
  if (p.startsWith("/notifications")) return true;
  return false;
}
