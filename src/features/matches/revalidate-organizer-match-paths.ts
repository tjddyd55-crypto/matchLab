import { revalidatePath } from "next/cache";

/** 경기 상태·결과 변경 후 운영자 화면 RSC 캐시 무효화 */
export function revalidateOrganizerMatchPaths(
  eventId: string,
  bracketId?: string | null,
): void {
  revalidatePath(`/organizer/events/${eventId}/operation`);
  revalidatePath(`/organizer/events/${eventId}/brackets`);
  revalidatePath(`/organizer/events/${eventId}/check-in`);
  revalidatePath(`/organizer/events/${eventId}/results`);
  if (bracketId) {
    revalidatePath(`/organizer/events/${eventId}/brackets/${bracketId}`);
  }
}

/** 주심/채점심판 코트 화면 갱신 */
export function revalidateJudgeCourtPaths(courtId: string): void {
  revalidatePath(`/judge/courts/${courtId}/head`);
  revalidatePath(`/judge/courts/${courtId}/score`);
}

/** 공개 결과·대진 화면 갱신 */
export function revalidatePublicEventMatchPaths(
  publicSlug?: string | null,
): void {
  if (!publicSlug) return;
  revalidatePath(`/events/${publicSlug}/results`);
  revalidatePath(`/events/${publicSlug}/brackets`);
  revalidatePath(`/events/${publicSlug}/live`);
  revalidatePath(`/events/${publicSlug}/watch`);
}
