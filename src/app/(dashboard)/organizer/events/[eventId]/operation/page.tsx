import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { OrganizerMatchesRealtimeBridge } from "@/components/domain/matches/OrganizerMatchesRealtimeBridge";
import { OrganizerOperationBoard } from "@/components/domain/operation/OrganizerOperationBoard";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { loadEventManagementNavContext, eventManagementLayoutProps } from "@/lib/event-management-nav-context";
import { eventCourtService } from "@/lib/services/event-court.service";
import { matchService } from "@/lib/services/match.service";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import { eventQrSectionHref } from "@/lib/event-qr-section";
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

  const [nav, matches, courts, judgeSummaries, judgeBriefByMatch] =
    await Promise.all([
      loadEventManagementNavContext(eventId),
      matchService.listOrganizerEventMatches(actor, eventId),
      eventCourtService.listForOrganizer(actor, eventId),
      judgeScorecardService.getEventJudgeSummary(actor, eventId),
      judgeScorecardService.listSubmittedBriefByEvent(actor, eventId),
    ]);

  const judgeSummaryByMatch = new Map(
    judgeSummaries.map((s) => [s.matchId, s] as const),
  );

  const bracketIds = [...new Set(matches.map((m) => m.bracketId))];

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <OrganizerMatchesRealtimeBridge
        eventId={eventId}
        bracketIds={bracketIds}
        organizerId={actor.organizerId ?? null}
      />

      <EventManagementPageHeader
        title="경기 운영"
        eventTitle={nav.title}
        description="대회 당일 경기 순서와 상태를 관리합니다."
        className="mb-3 gap-1 [&>div:first-child]:gap-1 [&_h1]:text-2xl [&_h1]:leading-tight"
      >
        <Link
          href={eventQrSectionHref(eventId, "onsiteOps")}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "inline-flex h-9",
          )}
        >
          운영관리 QR
        </Link>
      </EventManagementPageHeader>

      <OrganizerOperationBoard
        matches={matches}
        courts={courts}
        judgeSummaryByMatch={Object.fromEntries(judgeSummaryByMatch)}
        judgeBriefByMatch={judgeBriefByMatch}
      />
    </EventManagementLayout>
  );
}
