/**
 * 관람용 공개 페이지(대진표·라이브·결과) 시간 제한.
 * spectatorAccessEnabled 가 false 이면 기존처럼 상시 허용.
 */
export type SpectatorAccessFields = {
  spectatorAccessEnabled: boolean;
  spectatorAccessStartAt: Date | null;
  spectatorAccessEndAt: Date | null;
};

export type SpectatorAccessState =
  | "always_open"
  | "open"
  | "before"
  | "after"
  | "misconfigured";

export function resolveSpectatorAccessState(
  ev: SpectatorAccessFields,
  now: Date = new Date(),
): SpectatorAccessState {
  if (!ev.spectatorAccessEnabled) return "always_open";
  const start = ev.spectatorAccessStartAt;
  const end = ev.spectatorAccessEndAt;
  if (!start || !end) return "misconfigured";
  if (now < start) return "before";
  if (now > end) return "after";
  return "open";
}

export function isSpectatorContentAccessible(
  ev: SpectatorAccessFields,
  now: Date = new Date(),
): boolean {
  const state = resolveSpectatorAccessState(ev, now);
  return state === "always_open" || state === "open";
}

export function spectatorAccessStateMessage(state: SpectatorAccessState): {
  title: string;
  description: string;
} {
  switch (state) {
    case "before":
      return {
        title: "아직 공개 전입니다.",
        description:
          "대진표·결과·라이브는 주최자가 설정한 관람 공개 시간에 열립니다.",
      };
    case "after":
      return {
        title: "공개 기간이 종료되었습니다.",
        description:
          "관람 공개 기간이 지나 대진표·결과·라이브를 볼 수 없습니다.",
      };
    case "misconfigured":
      return {
        title: "관람 공개 설정을 확인해 주세요.",
        description:
          "관람 시간 제한이 켜져 있으나 시작·종료 시각이 설정되지 않았습니다.",
      };
    default:
      return {
        title: "공개 시간이 아닙니다",
        description:
          "관람용 페이지(대진표·라이브·결과)는 주최자가 설정한 시간에만 열립니다.",
      };
  }
}

export function toSpectatorAccessFields(input: {
  spectatorAccessEnabled: boolean;
  spectatorAccessStartAt: string | Date | null;
  spectatorAccessEndAt: string | Date | null;
}): SpectatorAccessFields {
  return {
    spectatorAccessEnabled: input.spectatorAccessEnabled,
    spectatorAccessStartAt: input.spectatorAccessStartAt
      ? new Date(input.spectatorAccessStartAt)
      : null,
    spectatorAccessEndAt: input.spectatorAccessEndAt
      ? new Date(input.spectatorAccessEndAt)
      : null,
  };
}
