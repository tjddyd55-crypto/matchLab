/**
 * 대진표 카드 텍스트 계층 SSOT
 * — 선수명·경기번호·메타·VS 등 카드 내 타이포는 여기서만 조정
 */
export const bracketCardTypography = {
  headerRow: "text-sm",
  matchNumber: "text-base font-bold sm:text-lg",
  division: "text-sm text-muted-foreground",
  meta: "text-xs text-muted-foreground sm:text-sm",
  opsPill:
    "text-xs font-medium sm:text-sm rounded-full border px-2.5 py-0.5",
  formatBadge: "text-xs sm:text-sm",
  fighterCorner: "text-xs font-semibold sm:text-sm",
  fighterName: "text-lg font-bold leading-tight sm:text-xl",
  fighterGym: "text-sm text-muted-foreground",
  fighterRecord: "text-xs text-muted-foreground sm:text-sm",
  vs: "text-xl font-black tracking-widest text-muted-foreground sm:text-2xl",
  vsAccent: "text-xl font-black tracking-widest text-primary sm:text-2xl",
  resultFooter: "text-xs text-muted-foreground sm:text-sm",
  spectatorCornerLabel:
    "text-xs font-semibold tracking-wide text-muted-foreground sm:text-sm",
  spectatorFighterName: "text-lg font-semibold leading-snug sm:text-xl",
  spectatorGym: "text-sm text-muted-foreground",
} as const;
