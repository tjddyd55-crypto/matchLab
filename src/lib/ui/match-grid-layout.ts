/** Bracket match row — 5열 grid: 경기번호 | 홍 | VS | 청 | 상태 (레거시 헤더용) */
export const bracketMatchRowGridClass =
  "grid grid-cols-1 gap-1.5 md:grid-cols-[minmax(4.5rem,5.25rem)_minmax(220px,1fr)_minmax(140px,170px)_minmax(220px,1fr)_minmax(5rem,6rem)] md:items-stretch md:gap-x-2";

/** 대진표 본문 — RED | 중앙 | BLUE 3열 */
export const bracketMatchFightersGridClass =
  "grid grid-cols-1 gap-2 px-3 py-2 md:grid-cols-[minmax(220px,1fr)_minmax(140px,170px)_minmax(220px,1fr)] md:items-stretch md:gap-x-2";

/** Bracket control row — 좌: 경기장 / 중: 라운드·시간 / 우: 순서 */
export const bracketMatchControlsGridClass =
  "grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]";

/** 경기장·라운드·시간 운영 control SSOT — 높이·폭 통일 */
export const matchOperationalControlHeightClass = "h-9";

export const matchCourtSelectClass =
  `${matchOperationalControlHeightClass} w-[140px] min-w-[140px] max-w-[140px] truncate rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;

/** 경기 카드 상단 경기구분 select — form control h-9 SSOT + 가독성 */
export const matchDivisionSelectClass =
  `${matchOperationalControlHeightClass} min-w-[10rem] max-w-[12rem] truncate rounded-md border border-input bg-background px-3 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;

/** 모바일·블록 폼 — 컨테이너 폭을 넘지 않도록 */
export const matchCourtSelectFluidClass =
  `${matchOperationalControlHeightClass} w-full min-w-0 max-w-full truncate rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-[140px] md:min-w-[140px] md:max-w-[140px]`;

export const matchCourtSaveButtonClass =
  `${matchOperationalControlHeightClass} min-w-[52px] shrink-0 px-3 text-xs`;

export const matchRoundSelectClass =
  `${matchOperationalControlHeightClass} w-[72px] min-w-[72px] max-w-[72px] rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;

export const matchDurationSelectClass =
  `${matchOperationalControlHeightClass} w-[80px] min-w-[80px] max-w-[80px] rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;

export const matchOperationalControlsRowClass =
  "flex flex-nowrap items-center gap-2";

export const matchGridCellCenterClass =
  "flex min-h-[2.75rem] min-w-0 items-center justify-center";

export const matchGridCellStartClass =
  "flex min-h-[2.75rem] min-w-0 items-center justify-start";

export const fieldStatusCenterCellClass =
  "flex min-h-[2.25rem] w-full min-w-0 items-center justify-center";

export const fieldStatusTextCellClass =
  "flex min-h-[2.25rem] min-w-0 items-center justify-start";

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
