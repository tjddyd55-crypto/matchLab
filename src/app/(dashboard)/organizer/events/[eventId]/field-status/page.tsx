import Link from "next/link";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { OrganizerCourtFieldStatusBoard } from "@/components/domain/field-status/OrganizerCourtFieldStatusBoard";
import { OrganizerMatchesRealtimeBridge } from "@/components/domain/matches/OrganizerMatchesRealtimeBridge";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";
import { eventCourtService } from "@/lib/services/event-court.service";
import { matchService } from "@/lib/services/match.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerEventFieldStatusPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [nav, matches, courts] = await Promise.all([
    loadEventManagementNavContext(eventId),
    matchService.listOrganizerEventMatches(actor, eventId),
    eventCourtService.listForOrganizer(actor, eventId),
  ]);

  const bracketIds = [...new Set(matches.map((match) => match.bracketId))];

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <OrganizerMatchesRealtimeBridge
        eventId={eventId}
        bracketIds={bracketIds}
        organizerId={actor.organizerId ?? null}
      />

      <EventManagementPageHeader
        title="경기장 현황"
        eventTitle={nav.title}
        description="전체 경기장의 현재·다음·최근 종료 경기를 한눈에 확인합니다. 상세 운영과 결과 입력은 경기 운영 화면에서 진행합니다."
      >
        <Link
          href={`/organizer/events/${eventId}/operation`}
          className={cn(buttonVariants({ variant: "default", size: "field" }), "mt-2 inline-flex")}
        >
          경기 운영으로 이동
        </Link>
      </EventManagementPageHeader>

      <OrganizerCourtFieldStatusBoard
        eventId={eventId}
        eventTitle={nav.title}
        matches={matches}
        courts={courts}
      />
    </EventManagementLayout>
  );
}
