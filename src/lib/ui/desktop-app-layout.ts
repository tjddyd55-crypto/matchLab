/** MATCHON Manager(Electron) — outer scroll + growable desktop layout SSOT. */

export const DESKTOP_APP_HTML_CLASS = "desktop-app";

/**
 * Baseline floor (freeze when window is smaller).
 * Above this width the normal PC layout grows fluidly — never a compact redesign.
 *
 * Shell math (must match globals.css):
 *   canvas min 1440
 *   − global sidebar 14rem(224) = main min 1216
 *   − event sidebar 232           = content min 984
 */
export const DESKTOP_APP_MIN_WIDTH = "1440px";
export const DESKTOP_APP_MIN_HEIGHT = "900px";
export const DESKTOP_LAYOUT_BASE_WIDTH = DESKTOP_APP_MIN_WIDTH;
export const DESKTOP_LAYOUT_BASE_HEIGHT = DESKTOP_APP_MIN_HEIGHT;

export const DESKTOP_MAIN_MIN_WIDTH = "1216px";
export const DESKTOP_CONTENT_MIN_WIDTH = "984px";

export const desktopAppViewportClass = "desktop-app-viewport";
export const desktopAppCanvasClass = "desktop-app-canvas";
export const desktopAppMainClass = "desktop-app-main";
export const desktopAppEventLayoutClass = "desktop-app-event-layout";
export const desktopAppEventMainClass = "desktop-app-event-main";

/** Markers for QA / overflow policy — widths stay fluid (fr), not fixed px caps. */
export const desktopWorkspaceGridClass = "desktop-workspace-grid";
export const desktopMatchedPanelClass = "desktop-matched-panel";
export const desktopUnmatchedPanelClass = "desktop-unmatched-panel";
