import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { AutoBracketGenerationPanel } from "@/components/domain/brackets/AutoBracketGenerationPanel";
import { bracketAutoMatchService } from "@/lib/services/bracket-auto-match.service";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { BracketCreateForm } from "@/components/domain/brackets/BracketCreateForm";
import { OrganizerBracketList } from "@/components/domain/brackets/OrganizerBracketList";
import { BracketPublicationPanel } from "@/components/domain/brackets/BracketPublicationPanel";
import { UnmatchedBracketCandidatesPanel } from "@/components/domain/brackets/UnmatchedBracketCandidatesPanel";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";

export const dynamic = "force-dynamic";

export default async function OrganizerEventBracketsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [nav, brackets, divisions, unmatchedCandidates, resetCheck, publication] =
    await Promise.all([
      loadEventManagementNavContext(eventId),
      bracketService.listOrganizerEventBrackets(actor, eventId),
      eventService.listOrganizerEventDivisions(actor, eventId),
      bracketAutoMatchService.listUnmatchedCandidatesForEvent(actor, eventId),
      bracketAutoMatchService.canResetBracketSafely(actor, eventId),
      eventService.getEventBracketPublicationSettings(actor, eventId),
    ]);

  const publicBracketCount = brackets.filter((b) => b.isPublic).length;

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="대진표 관리"
        eventTitle={nav.title}
        description="대진표 그룹은 부문별로 묶인 경기 목록입니다. 같은 대회에서 토너먼트와 경기 목록 방식을 함께 둘 수 있습니다."
      />

      <BracketPublicationPanel
        eventId={eventId}
        publicSlug={publication.publicSlug}
        publicUnmatchedListEnabled={publication.publicUnmatchedListEnabled}
        hasPublicBrackets={publicBracketCount > 0}
        publicBracketCount={publicBracketCount}
        totalBracketCount={brackets.length}
      />

      <AutoBracketGenerationPanel
        eventId={eventId}
        canResetSafely={resetCheck.safe}
        matchesWithResults={resetCheck.matchesWithResults}
      />

      <UnmatchedBracketCandidatesPanel candidates={unmatchedCandidates} />

      <BracketCreateForm eventId={eventId} divisions={divisions} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">대진표 그룹</h2>
        {brackets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            아직 생성된 대진표가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <OrganizerBracketList eventId={eventId} brackets={brackets} />
          </div>
        )}
      </div>
    </EventManagementLayout>
  );
}
