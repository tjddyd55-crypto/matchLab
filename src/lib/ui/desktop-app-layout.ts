/** MATCHON Manager(Electron) — fixed canvas + scroll viewport layout tokens. */

export const DESKTOP_APP_HTML_CLASS = "desktop-app";

/** Default window size SSOT (`desktop/electron/window-state.ts`). */
export const DESKTOP_APP_MIN_WIDTH = "1440px";
export const DESKTOP_APP_MIN_HEIGHT = "900px";

/**
 * Shell width SSOT (globals.css CSS vars must match):
 * canvas 1440 − global sidebar 14rem(224) = main 1216
 * main 1216 − event sidebar 232 = content 984
 */
export const DESKTOP_MAIN_MIN_WIDTH = "1216px";
export const DESKTOP_CONTENT_MIN_WIDTH = "984px";

export const desktopAppViewportClass = "desktop-app-viewport";
export const desktopAppCanvasClass = "desktop-app-canvas";
export const desktopAppMainClass = "desktop-app-main";
export const desktopAppEventLayoutClass = "desktop-app-event-layout";
export const desktopAppEventMainClass = "desktop-app-event-main";
