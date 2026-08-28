import { redirect } from "next/navigation";
import { BillingCheckoutClient } from "@/components/domain/billing/BillingCheckoutClient";
import {
  dashboardPathForRole,
  requireActor,
} from "@/lib/auth/actor";
import { isBillingRequirePaymentMethodForTrial } from "@/lib/billing/billing-flags";
import { getTossBillingEnv } from "@/lib/billing/toss-env";
import { billingService } from "@/lib/services/billing.service";

export const dynamic = "force-dynamic";

export default async function BillingCheckoutPage() {
  const actor = await requireActor();
  if (actor.role === "admin") {
    redirect(dashboardPathForRole(actor.role));
  }
  if (actor.role !== "gym" && actor.role !== "organizer") {
    redirect(dashboardPathForRole(actor.role));
  }

  const plans = await billingService.listActivePlans();
  const vm = plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    interval: p.interval === "YEAR" ? ("YEAR" as const) : ("MONTH" as const),
    price: p.price,
  }));

  const toss = await getTossBillingEnv();

  return (
    <BillingCheckoutClient
      plans={vm}
      tossClientKey={toss.clientKey}
      tossReady={toss.pgReady}
      isTestKey={toss.isTestKey}
      requirePmForTrial={isBillingRequirePaymentMethodForTrial()}
    />
  );
}
