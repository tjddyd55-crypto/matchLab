import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** @deprecated `/operation` 으로 통합 — 기존 링크 하위 호환 */
export default async function OrganizerEventMatchesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/organizer/events/${eventId}/operation`);
}
