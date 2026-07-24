import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 체육관 포털에서는 현장 계체를 제공하지 않는다.
 * Organizer 현장 계체(/organizer/.../check-in|field-status)는 유지.
 * 기존 북마크·링크 호환을 위해 route는 남기고 신청 현황으로 보낸다.
 */
export default async function GymEventFieldStatusPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/gym/events/${eventId}/status`);
}
