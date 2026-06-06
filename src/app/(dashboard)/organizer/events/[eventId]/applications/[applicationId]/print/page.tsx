import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationService } from "@/lib/services/application.service";
import { PrintCustomFormApplication } from "@/components/domain/applications/PrintCustomFormApplication";

export const dynamic = "force-dynamic";

export default async function PrintCustomFormApplicationPage({
  params,
}: {
  params: Promise<{ eventId: string; applicationId: string }>;
}) {
  const actor = await requireActor();
  const { eventId, applicationId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  let data;
  try {
    data = await applicationService.getOrganizerApplicationPrintDetail(
      actor,
      eventId,
      applicationId,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  return <PrintCustomFormApplication data={data} />;
}
