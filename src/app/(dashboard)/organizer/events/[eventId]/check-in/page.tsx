import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { fieldStatusService } from "@/lib/services/field-status.service";
import { OrganizerFieldStatusBoard } from "@/components/domain/field-status/OrganizerFieldStatusBoard";
import { EventManagementNav } from "@/components/domain/events/EventManagementNav";
import { eventRepository } from "@/lib/repositories/event.repository";
import { resolveOrganizerEventPageError } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function OrganizerEventCheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  try {
    await requireOrganizerForEventPage(actor, eventId);
  } catch (e) {
    resolveOrganizerEventPageError(e);
  }

  const [fieldStatus, eventMeta] = await Promise.all([
    fieldStatusService.listOrganizerEventFieldStatus(actor, eventId),
    eventRepository.findOrganizerEventById(eventId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,90rem)] flex-col gap-8 px-4 py-8 md:px-6">
      {eventMeta ? (
        <EventManagementNav
          eventId={eventId}
          publicSlug={eventMeta.publicSlug}
        />
      ) : null}

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          현장 확인·계체
        </h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          승인된 신청자에 대해 현장 확인(체크인), 계체, 출전 확정 상태를
          기록합니다. 현장 확인은 계체 통과와 별개이며, 출전 확정은 현장 확인
          완료와 계체 통과(또는 수동 승인)가 모두 충족될 때 표시됩니다.
        </p>
      </div>

      <OrganizerFieldStatusBoard
        rows={fieldStatus.rows}
        summary={fieldStatus.summary}
      />
    </div>
  );
}
