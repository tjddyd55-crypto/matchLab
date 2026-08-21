import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { BracketPublicationPanel } from "@/components/domain/brackets/BracketPublicationPanel";
import { OrganizerBracketsTabShell } from "@/components/domain/brackets/OrganizerBracketsTabShell";
import { OrganizerBracketsGenerateSection } from "@/components/domain/brackets/OrganizerBracketsGenerateSection";
import { OrganizerCourtManagementSection } from "@/components/domain/courts/OrganizerCourtManagementSection";
import { OrganizerCourtViewSection } from "@/components/domain/courts/OrganizerCourtViewSection";
import { parseBracketPageTab } from "@/lib/brackets/bracket-page-tab";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { loadEventManagementNavContext, eventManagementLayoutProps } from "@/lib/event-management-nav-context";

export const dynamic = "force-dynamic";

export default async function OrganizerEventBracketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  const sp = await searchParams;
  const activeTab = parseBracketPageTab(sp.tab);

  await requireOrganizerForEventPage(actor, eventId);

  const [nav, brackets, publication] = await Promise.all([
    loadEventManagementNavContext(eventId),
    bracketService.listOrganizerEventBrackets(actor, eventId),
    eventService.getEventBracketPublicationSettings(actor, eventId),
  ]);

  const existingBrackets = brackets.filter((b) => b.bracketId);
  const publicBracketCount = existingBrackets.filter((b) => b.isPublic).length;

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <EventManagementPageHeader
        title="대진표 관리"
        eventTitle={nav.title}
      />

      <OrganizerBracketsTabShell
        eventId={eventId}
        activeTab={activeTab}
        settings={
          <div className="flex flex-col gap-8">
            <BracketPublicationPanel
              eventId={eventId}
              publicSlug={publication.publicSlug}
              publicUnmatchedListEnabled={publication.publicUnmatchedListEnabled}
              hasPublicBrackets={publicBracketCount > 0}
              publicBracketCount={publicBracketCount}
              totalBracketCount={existingBrackets.length}
            />
            <OrganizerCourtManagementSection eventId={eventId} />
          </div>
        }
        generate={<OrganizerBracketsGenerateSection eventId={eventId} />}
        view={<OrganizerCourtViewSection eventId={eventId} />}
      />
    </EventManagementLayout>
  );
}
