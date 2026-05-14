import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { bracketService } from "@/lib/services/bracket.service";
import { OrganizerBracketEditor } from "@/components/domain/brackets/OrganizerBracketEditor";

export const dynamic = "force-dynamic";

export default async function OrganizerBracketDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; bracketId: string }>;
}) {
  const actor = await requireActor();
  const { eventId, bracketId } = await params;

  await requireOrganizerForEvent(actor, eventId);

  const detail = await bracketService.getOrganizerBracketDetail(actor, bracketId);
  if (detail.eventId !== eventId) {
    notFound();
  }

  return <OrganizerBracketEditor eventId={eventId} detail={detail} />;
}
