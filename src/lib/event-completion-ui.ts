import type { EventArchiveFinishSummary } from "@/lib/event-archive/types";

export function buildEventFinishConfirmDescription(
  stats: EventArchiveFinishSummary | null,
): string {
  const lines = [
    "종료 후:",
    '· 대회 상태가 "대회 종료"로 변경됩니다.',
    "· 신청자, 대진표, 계체, 경기 결과 등의 기록은 보존됩니다.",
    "· 종료 후에는 기본적으로 운영 데이터가 읽기 전용으로 전환됩니다.",
    "· 필요 시 기록을 다운로드할 수 있습니다.",
    "· 대회 종료 및 기록 보관이 함께 진행됩니다.",
  ];
  if (stats) {
    lines.push(
      "",
      `신청자 ${stats.applicantCount}명`,
      `총 경기 ${stats.totalMatchCount}경기 · 경기 종료 ${stats.completedMatchCount}경기`,
    );
    if (stats.weighInPendingCount > 0) {
      lines.push(`계체 미완료 ${stats.weighInPendingCount}명`);
    }
    const warnings = [
      stats.unconfirmedResultCount > 0
        ? `결과 미입력 경기가 ${stats.unconfirmedResultCount}건 있습니다.`
        : null,
      stats.pendingMatchCount > 0
        ? `미종료 경기가 ${stats.pendingMatchCount}건 있습니다.`
        : null,
    ].filter(Boolean);
    if (warnings.length > 0) {
      lines.push("", `${warnings.join(" ")} 그래도 종료하시겠습니까?`);
    }
  }
  return lines.join("\n");
}
