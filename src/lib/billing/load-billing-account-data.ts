import type { ActorContext } from "@/lib/auth/actor-context";
import { billingService } from "@/lib/services/billing.service";

export async function loadBillingAccountData(actor: ActorContext) {
  const [sub, payments] = await Promise.all([
    billingService.getMySubscription(actor),
    billingService.getMyPayments(actor),
  ]);
  return { sub, payments };
}
