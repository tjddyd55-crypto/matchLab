/**
 * 관람용 공개 페이지(대진표·라이브·결과) 시간 제한.
 * spectatorAccessEnabled 가 false 이면 기존처럼 상시 허용.
 */
export type SpectatorAccessFields = {
  spectatorAccessEnabled: boolean;
  spectatorAccessStartAt: Date | null;
  spectatorAccessEndAt: Date | null;
};

export function isSpectatorContentAccessible(
  ev: SpectatorAccessFields,
  now: Date = new Date(),
): boolean {
  if (!ev.spectatorAccessEnabled) return true;
  const start = ev.spectatorAccessStartAt;
  const end = ev.spectatorAccessEndAt;
  if (!start || !end) return false;
  return now >= start && now <= end;
}
