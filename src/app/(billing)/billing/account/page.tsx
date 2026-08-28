import { redirect } from "next/navigation";
import {
  dashboardPathForRole,
  requireActor,
} from "@/lib/auth/actor";
import { billingAccountPathForRole } from "@/lib/billing/billing-account-path";

export const dynamic = "force-dynamic";

/** Legacy URL — redirects into Manager dashboard shell routes */
export default async function BillingAccountPage() {
  const actor = await requireActor();
  if (actor.role === "admin") {
    redirect(dashboardPathForRole(actor.role));
  }
  if (actor.role !== "gym" && actor.role !== "organizer") {
    redirect(dashboardPathForRole(actor.role));
  }

  const dashboardPath = billingAccountPathForRole(actor.role);
  redirect(dashboardPath ?? dashboardPathForRole(actor.role));
}
