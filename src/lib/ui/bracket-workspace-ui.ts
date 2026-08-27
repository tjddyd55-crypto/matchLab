/**
 * 대진표 그룹 상세 Desktop workspace — 좌/우 pane 동일 높이·scroll 분리 SSOT
 */
/** Desktop: fixed paper height (not 70vh — window shrink must not change pane). */
export const BRACKET_WORKSPACE_PANE_HEIGHT_CLASS =
  "lg:h-[min(70vh,720px)] desktop:h-[720px]";

/** Card outer: flex column + fixed desktop height */
export const bracketWorkspacePaneClass = cnSafe(
  "flex min-h-0 flex-col",
  BRACKET_WORKSPACE_PANE_HEIGHT_CLASS,
);

/** Header / filters — scroll 밖 */
export const bracketWorkspaceControlsClass = "shrink-0 space-y-2";

/**
 * Scope / compact action row (우측 탭).
 * 좌측은 동일 min-height spacer로 리스트 시작 Y를 맞춘다.
 */
export const bracketWorkspaceScopeRowClass =
  "flex min-h-8 flex-wrap items-center gap-1";

/**
 * Match / player list — vertical scroll only.
 * Desktop overflow-x is forced hidden in globals (overflow-y:auto pairs overflow-x to auto).
 */
export const bracketWorkspaceListScrollClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 desktop:overflow-x-hidden";

/** Title / action row: 좌우 동일 baseline */
export const bracketWorkspaceTitleRowClass =
  "flex min-h-10 flex-wrap items-center justify-between gap-2 desktop:flex-nowrap";

/** 우측 scope + 수동 경기 만들기 1행 */
export const bracketWorkspaceActionRowClass =
  "flex min-h-10 flex-wrap items-center justify-between gap-2 desktop:flex-nowrap";

function cnSafe(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
