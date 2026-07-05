/** Bracket match row — 5열 grid: 경기번호 | 홍 | VS | 청 | 상태 */
export const bracketMatchRowGridClass =
  "grid grid-cols-1 gap-1.5 md:grid-cols-[3rem_minmax(0,1.15fr)_4rem_minmax(0,1.15fr)_4.75rem] md:items-stretch md:gap-x-2";

/** Bracket control row — 좌: 경기장 / 중: 라운드·시간 / 우: 순서 */
export const bracketMatchControlsGridClass =
  "grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(7rem,auto)_minmax(0,1fr)]";

export const matchGridCellCenterClass =
  "flex min-h-[2.75rem] min-w-0 items-center justify-center";

export const matchGridCellStartClass =
  "flex min-h-[2.75rem] min-w-0 items-center justify-start";

export const fieldStatusCenterCellClass =
  "flex min-h-[2.5rem] w-full min-w-0 items-center justify-center";

export const fieldStatusTextCellClass =
  "flex min-h-[2.5rem] min-w-0 items-center justify-start";

export const tableCellCenterClass =
  "flex min-h-[2.75rem] w-full items-center justify-center";

export const tableCellStartClass =
  "flex min-h-[2.75rem] w-full min-w-0 items-center justify-start";

export const nowrapTruncateClass = "truncate whitespace-nowrap";

/** select 표시용 — 긴 배정 경고/사유 축약 (title에는 원문 유지) */
export function shortenAssignabilityReason(
  reason: string | null | undefined,
): string | null {
  if (!reason?.trim()) return null;
  const text = reason.trim();
  if (text.includes("현장 확인") || text.includes("현장 미확인")) {
    return "현장 미확인";
  }
  if (text.includes("계체") && text.includes("완료")) return "계체 미완료";
  if (text.includes("몸무게")) return "몸무게 미입력";
  if (text.includes("실격")) return "실격";
  if (text.includes("경기취소")) return "경기취소";
  if (text.includes("반대 코너") || text.includes("코너")) return "코너 중복";
  if (text.length <= 20) return text;
  return `${text.slice(0, 19)}…`;
}
