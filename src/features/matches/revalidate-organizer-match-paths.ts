import { revalidatePath } from "next/cache";

/** 경기 상태·결과 변경 후 운영자 화면 RSC 캐시 무효화 */
export function revalidateOrganizerMatchPaths(
  eventId: string,
  bracketId?: string | null,
): void {
  revalidatePath(`/organizer/events/${eventId}/operation`);
  revalidatePath(`/organizer/events/${eventId}/brackets`);
  revalidatePath(`/organizer/events/${eventId}/check-in`);
  if (bracketId) {
    revalidatePath(`/organizer/events/${eventId}/brackets/${bracketId}`);
  }
}
