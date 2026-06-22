/**
 * 대진표 카드 typography SSOT
 * — 선수명·경기번호·메타·VS 등은 여기서만 조정
 */
export const bracketCardTextTokens = {
  headerRow: "text-sm md:text-base",
  matchTitle: "text-base font-bold md:text-lg",
  matchNumber: "text-base font-bold md:text-lg",
  matchMeta: "text-sm font-medium text-muted-foreground",
  division: "text-sm font-medium text-muted-foreground",
  meta: "text-sm font-medium text-muted-foreground",
  opsPill:
    "rounded-full border px-2.5 py-0.5 text-xs font-medium md:text-sm",
  formatBadge: "text-xs font-semibold md:text-sm",
  badge: "text-xs font-semibold md:text-sm",
  helper: "text-xs text-muted-foreground md:text-sm",
  fighterCorner: "text-xs font-semibold md:text-sm",
  fighterName: "text-lg font-extrabold leading-tight tracking-tight md:text-xl",
  fighterGym: "text-sm text-muted-foreground md:text-base",
  fighterRecord: "text-xs text-muted-foreground md:text-sm",
  vs: "text-xl font-black tracking-widest text-muted-foreground md:text-2xl",
  vsAccent: "text-xl font-black tracking-widest text-primary md:text-2xl",
  resultFooter: "text-xs text-muted-foreground md:text-sm",
  spectatorCornerLabel:
    "text-xs font-semibold tracking-wide text-muted-foreground md:text-sm",
  spectatorFighterName:
    "text-lg font-extrabold leading-snug tracking-tight md:text-xl",
  spectatorGym: "text-sm text-muted-foreground md:text-base",
} as const;

/** @deprecated bracketCardTextTokens 사용 */
export const bracketCardTypography = bracketCardTextTokens;
