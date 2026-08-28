import { redirect } from "next/navigation";
import { BillingAccountView } from "@/components/domain/billing/BillingAccountView";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import { loadBillingAccountData } from "@/lib/billing/load-billing-account-data";

export const dynamic = "force-dynamic";

export default async function GymBillingAccountPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "gym_staff", "admin"]);
  if (actor.role !== "gym") {
    redirect("/gym");
  }

  const { sub, payments } = await loadBillingAccountData(actor);

  return (
    <BillingAccountView
      sub={sub}
      payments={payments}
      embeddedInDashboard
    />
  );
}
