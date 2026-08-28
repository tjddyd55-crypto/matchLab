import { redirect } from "next/navigation";
import { BillingAccountView } from "@/components/domain/billing/BillingAccountView";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import { loadBillingAccountData } from "@/lib/billing/load-billing-account-data";

export const dynamic = "force-dynamic";

export default async function OrganizerBillingAccountPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  if (actor.role !== "organizer") {
    redirect("/organizer");
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
