/** MATCHON Manager(Electron) — fixed full-layout canvas SSOT. */

export const DESKTOP_APP_HTML_CLASS = "desktop-app";

/**
 * Full-layout paper size (maximized workspace geometry).
 * Window may be smaller; outer viewport scrolls — content never shrinks.
 *
 * Shell math (must match globals.css):
 *   canvas 1600
 *   − global sidebar 14rem (224) = main 1376
 *   − event sidebar 232           = event content 1144
 *   − content padding-x 2rem×2    = workspace 1080
 *   matched 640 + gap 20 + unmatched 420 = 1080
 */
export const DESKTOP_LAYOUT_BASE_WIDTH = "1600px";
export const DESKTOP_LAYOUT_BASE_HEIGHT = "900px";
export const DESKTOP_APP_MIN_WIDTH = DESKTOP_LAYOUT_BASE_WIDTH;
export const DESKTOP_APP_MIN_HEIGHT = DESKTOP_LAYOUT_BASE_HEIGHT;

export const DESKTOP_MAIN_WIDTH = "1376px";
export const DESKTOP_EVENT_CONTENT_WIDTH = "1144px";
export const DESKTOP_WORKSPACE_WIDTH = "1080px";
export const DESKTOP_MATCHED_PANEL_WIDTH = "640px";
export const DESKTOP_UNMATCHED_PANEL_WIDTH = "420px";
export const DESKTOP_WORKSPACE_GAP = "20px";

/** @deprecated alias — prefer DESKTOP_MAIN_WIDTH */
export const DESKTOP_MAIN_MIN_WIDTH = DESKTOP_MAIN_WIDTH;
/** @deprecated alias — prefer DESKTOP_EVENT_CONTENT_WIDTH */
export const DESKTOP_CONTENT_MIN_WIDTH = DESKTOP_EVENT_CONTENT_WIDTH;

export const desktopAppViewportClass = "desktop-app-viewport";
export const desktopAppCanvasClass = "desktop-app-canvas";
export const desktopAppMainClass = "desktop-app-main";
export const desktopAppEventLayoutClass = "desktop-app-event-layout";
export const desktopAppEventMainClass = "desktop-app-event-main";
export const desktopWorkspaceGridClass = "desktop-workspace-grid";
export const desktopMatchedPanelClass = "desktop-matched-panel";
export const desktopUnmatchedPanelClass = "desktop-unmatched-panel";
