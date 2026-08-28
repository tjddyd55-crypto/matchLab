/** Manager sidebar / dashboard billing account route SSOT */
export function billingAccountPathForRole(role: string): string | null {
  switch (role) {
    case "organizer":
      return "/organizer/billing/account";
    case "gym":
      return "/gym/billing/account";
    default:
      return null;
  }
}

/** Legacy `/billing/account` — dashboard path when role supports Manager shell */
export function resolveBillingAccountHref(role: string): string {
  return billingAccountPathForRole(role) ?? "/billing/account";
}
