import { redirect } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function OrganizerEventSchedulePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  redirect(`/organizer/events/${eventId}/brackets?tab=view`);
}
