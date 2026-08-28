import { EventArchiveView } from "@/components/domain/events/EventArchiveView";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { requireActor } from "@/lib/auth/actor";
import { EventStatus } from "@/lib/enums";
import {
  loadEventManagementNavContext,
  eventManagementLayoutProps,
} from "@/lib/event-management-nav-context";
import { resolveOrganizerEventPageError } from "@/lib/permissions";
import { eventService } from "@/lib/services/event.service";
import { eventArchiveService } from "@/lib/services/event-archive.service";
import { AppError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

export default async function OrganizerEventArchivePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  let detail;
  try {
    detail = await eventService.getOrganizerEventDetail(actor, eventId);
  } catch (e) {
    resolveOrganizerEventPageError(e);
  }

  const nav = await loadEventManagementNavContext(eventId);

  let archive = null;
  try {
    archive = await eventArchiveService.getActiveArchive(actor, eventId);
  } catch (e) {
    if (e instanceof AppError && e.code === "FORBIDDEN") {
      resolveOrganizerEventPageError(e);
    }
    throw e;
  }

  if (!archive) {
    const legacyFinished = detail.status === EventStatus.finished;
    return (
      <EventManagementLayout {...eventManagementLayoutProps(nav)}>
        <EventManagementPageHeader
          title="대회 기록"
          eventTitle={detail.title}
          description="종료 시점의 신청자·대진표·경기 결과를 조회합니다."
        />
        <EmptyState
          title={
            legacyFinished
              ? "보관된 기록이 없습니다"
              : "아직 기록이 생성되지 않았습니다"
          }
          description={
            legacyFinished
              ? "이 대회는 기록 보관 기능 도입 이전에 종료되었습니다. 현재 운영 데이터를 기록으로 대체하지 않습니다."
              : "대회 종료 시 신청자·대진표·경기 결과가 기록으로 저장됩니다."
          }
        />
      </EventManagementLayout>
    );
  }

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <EventManagementPageHeader
        title="대회 기록"
        eventTitle={detail.title}
        description={`기록 v${archive.version} · 종료 시점 데이터를 조회합니다.`}
      />
      <EventArchiveView archive={archive} />
    </EventManagementLayout>
  );
}
