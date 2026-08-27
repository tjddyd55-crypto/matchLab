import { redirect } from "next/navigation";
import { BillingCheckoutClient } from "@/components/domain/billing/BillingCheckoutClient";
import {
  dashboardPathForRole,
  requireActor,
} from "@/lib/auth/actor";
import { billingService } from "@/lib/services/billing.service";
import { evaluateBillingEntitlement } from "@/lib/billing/entitlement";

export const dynamic = "force-dynamic";

export default async function BillingCheckoutPage() {
  const actor = await requireActor();
  if (actor.role === "admin") {
    redirect(dashboardPathForRole(actor.role));
  }
  if (actor.role !== "gym" && actor.role !== "organizer") {
    redirect(dashboardPathForRole(actor.role));
  }

  const entitlement = await evaluateBillingEntitlement(actor);
  if (entitlement.entitled && entitlement.reason !== "enforce_disabled") {
    // Already entitled under enforce — allow account management instead of repurchase.
    // When enforce is off, still allow visiting checkout (promo activation / plan change later).
  }

  const plans = await billingService.listActivePlans();
  const vm = plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    interval: p.interval === "YEAR" ? ("YEAR" as const) : ("MONTH" as const),
    price: p.price,
  }));

  return <BillingCheckoutClient plans={vm} />;
}
