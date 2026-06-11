import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { bracketService } from "@/lib/services/bracket.service";
import { OrganizerBracketEditor } from "@/components/domain/brackets/OrganizerBracketEditor";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";

export const dynamic = "force-dynamic";

export default async function OrganizerBracketDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; bracketId: string }>;
}) {
  const actor = await requireActor();
  const { eventId, bracketId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [nav, detail] = await Promise.all([
    loadEventManagementNavContext(eventId),
    bracketService.getOrganizerBracketDetail(actor, bracketId),
  ]);

  if (detail.eventId !== eventId) {
    notFound();
  }

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <OrganizerBracketEditor eventId={eventId} detail={detail} />
    </EventManagementLayout>
  );
}
