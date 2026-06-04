import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationService } from "@/lib/services/application.service";
import { creditService } from "@/lib/services/credit.service";
import { eventRepository } from "@/lib/repositories/event.repository";
import { OrganizerApplicationsBoard } from "@/components/domain/applications/OrganizerApplicationsBoard";
import { OrganizerEventCreditNotice } from "@/components/domain/credits/OrganizerEventCreditNotice";
import { ApplicationStatus } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function OrganizerEventApplicationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const rows = await applicationService.listOrganizerEventApplications(
    actor,
    eventId,
  );

  const organizerId =
    actor.organizerId ??
    (await eventRepository.findEventOrganizerId(eventId));
  const pendingCount = rows.filter(
    (r) => r.applicationStatus === ApplicationStatus.pending,
  ).length;
  const creditCtx =
    organizerId != null
      ? await creditService.getEventApprovalCreditContext(
          organizerId,
          pendingCount,
        )
      : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          신청자 관리
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          입금 상태는 결제 행을 진실 원천으로 두며, 목록의 입금 상태는 동기화된 캐시입니다.
        </p>
      </div>

      {creditCtx ? <OrganizerEventCreditNotice credit={creditCtx} /> : null}

      <OrganizerApplicationsBoard rows={rows} />
    </div>
  );
}
