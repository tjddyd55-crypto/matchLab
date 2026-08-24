export const BRACKET_PAGE_TABS = ["settings", "generate", "view"] as const;

export type BracketPageTab = (typeof BRACKET_PAGE_TABS)[number];

export const BRACKET_PAGE_TAB_LABELS: Record<BracketPageTab, string> = {
  settings: "기본설정",
  generate: "대진표 생성",
  view: "대진표 보기",
};

/** 대진표 보기 내부 서브탭 — 경기장별 읽기 / 전체 경기 편집 */
export const BRACKET_VIEW_SUB_TABS = ["board", "workspace"] as const;

export type BracketViewSubTab = (typeof BRACKET_VIEW_SUB_TABS)[number];

export const BRACKET_VIEW_SUB_TAB_LABELS: Record<BracketViewSubTab, string> = {
  board: "경기장별 보기",
  workspace: "전체 경기 편집",
};

export function parseBracketPageTab(
  value: string | string[] | undefined | null,
): BracketPageTab {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === "settings" || raw === "generate" || raw === "view") {
    return raw;
  }

  return "view";
}

export function parseBracketViewSubTab(
  value: string | string[] | undefined | null,
): BracketViewSubTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "board" || raw === "workspace") return raw;
  return "board";
}
