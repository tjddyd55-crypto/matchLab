export const BRACKET_PAGE_TABS = ["settings", "generate", "view"] as const;

export type BracketPageTab = (typeof BRACKET_PAGE_TABS)[number];

export const BRACKET_PAGE_TAB_LABELS: Record<BracketPageTab, string> = {
  settings: "기본설정",
  generate: "대진표 생성",
  view: "대진표 보기",
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
