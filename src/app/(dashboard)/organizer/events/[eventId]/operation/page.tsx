import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { OrganizerMatchesRealtimeBridge } from "@/components/domain/matches/OrganizerMatchesRealtimeBridge";
import { OrganizerOperationBoard } from "@/components/domain/operation/OrganizerOperationBoard";
import { OrganizerOperationStaffLinkBanner } from "@/components/domain/operation/OrganizerOperationStaffLinkBanner";
import { requireActor } from "@/lib/auth/actor";
import { getAppBaseUrl } from "@/lib/app-url";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";
import { eventStaffAccessService } from "@/lib/services/event-staff-access.service";
import { eventCourtService } from "@/lib/services/event-court.service";
import { matchService } from "@/lib/services/match.service";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerEventOperationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [nav, matches, courts, staffRecorderLinks, judgeSummaries, judgeBriefByMatch] =
    await Promise.all([
    loadEventManagementNavContext(eventId),
    matchService.listOrganizerEventMatches(actor, eventId),
    eventCourtService.listForOrganizer(actor, eventId),
    eventStaffAccessService.listLinksForOrganizer(actor, eventId),
    judgeScorecardService.getEventJudgeSummary(actor, eventId),
    judgeScorecardService.listSubmittedBriefByEvent(actor, eventId),
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
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <OrganizerMatchesRealtimeBridge
        eventId={eventId}
        bracketIds={bracketIds}
        organizerId={actor.organizerId ?? null}
      />

      <EventManagementPageHeader
        title="경기 운영"
        eventTitle={nav.title}
        description="대회 당일 경기 순서와 상태를 관리합니다. 결과 입력은 기존 확정 흐름을 사용하며, 공식 전적은 확정 후에만 반영됩니다."
      >
        <Link
          href={`/organizer/events/${eventId}/qr`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 inline-flex")}
        >
          현장 QR 출력
        </Link>
      </EventManagementPageHeader>

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
              경기 row에서 결과 입력 패널로 집계 확인
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
        courts={courts}
        judgeSummaryByMatch={Object.fromEntries(judgeSummaryByMatch)}
        judgeBriefByMatch={judgeBriefByMatch}
      />
    </EventManagementLayout>
  );
}
