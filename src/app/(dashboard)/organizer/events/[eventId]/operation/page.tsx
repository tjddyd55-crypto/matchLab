import { EventManagementNav } from "@/components/domain/events/EventManagementNav";
import { OrganizerMatchesRealtimeBridge } from "@/components/domain/matches/OrganizerMatchesRealtimeBridge";
import { OrganizerOperationBoard } from "@/components/domain/operation/OrganizerOperationBoard";
import { OrganizerOperationStaffLinkBanner } from "@/components/domain/operation/OrganizerOperationStaffLinkBanner";
import { requireActor } from "@/lib/auth/actor";
import { getAppBaseUrl } from "@/lib/app-url";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { eventRepository } from "@/lib/repositories/event.repository";
import { eventStaffAccessService } from "@/lib/services/event-staff-access.service";
import { matchService } from "@/lib/services/match.service";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OrganizerEventOperationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [matches, eventMeta, staffRecorderLinks, judgeSummaries] =
    await Promise.all([
      matchService.listOrganizerEventMatches(actor, eventId),
      eventRepository.findOrganizerEventById(eventId),
      eventStaffAccessService.listLinksForOrganizer(actor, eventId),
      judgeScorecardService.getEventJudgeSummary(actor, eventId),
    ]);

  const judgeSummaryByMatch = new Map(
    judgeSummaries.map((s) => [s.matchId, s] as const),
  );
  const totalJudgeAssigned = judgeSummaries.reduce(
    (n, s) => n + s.assignedCount,
    0,
  );
  const totalJudgeSubmitted = judgeSummaries.reduce(
    (n, s) => n + s.submittedCount,
    0,
  );

  const bracketIds = [...new Set(matches.map((m) => m.bracketId))];

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,90rem)] flex-col gap-8 px-4 py-8 md:px-6">
      <OrganizerMatchesRealtimeBridge
        eventId={eventId}
        bracketIds={bracketIds}
        organizerId={actor.organizerId ?? null}
      />

      {eventMeta ? (
        <EventManagementNav
          eventId={eventId}
          publicSlug={eventMeta.publicSlug}
        />
      ) : null}

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          경기 운영
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {eventMeta?.title ?? matches[0]?.eventTitle ?? "행사"}
        </p>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
          대회 당일 경기 순서와 상태를 관리합니다. 결과 입력은 기존 확정
          흐름을 사용하며, 공식 전적은 확정 후에만 반영됩니다.
        </p>
      </div>

      <OrganizerOperationStaffLinkBanner
        eventId={eventId}
        baseUrl={getAppBaseUrl()}
        links={staffRecorderLinks}
      />

      <div className="rounded-lg border p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">심판 채점</p>
            <p className="text-muted-foreground mt-1 text-xs">
              배정 {totalJudgeAssigned}건 · 제출 {totalJudgeSubmitted}건 ·
              경기 상세 Drawer에서 집계 확인
            </p>
          </div>
          <Link
            href={`/organizer/events/${eventId}/judges`}
            className="text-primary text-sm underline"
          >
            심판 관리
          </Link>
        </div>
      </div>

      <OrganizerOperationBoard
        matches={matches}
        judgeSummaryByMatch={Object.fromEntries(judgeSummaryByMatch)}
      />
    </div>
  );
}
