import { OrganizerCourtViewSection } from "@/components/domain/courts/OrganizerCourtViewSection";

/** @deprecated 대진표 보기 탭(OrganizerCourtViewSection)을 사용하세요. */
export async function OrganizerCourtsSection({
  eventId,
}: {
  eventId: string;
}) {
  return <OrganizerCourtViewSection eventId={eventId} />;
}
