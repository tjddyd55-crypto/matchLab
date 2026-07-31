import type { BrowserWindowConstructorOptions, WebPreferences } from "electron";

/** BrowserWindow 보안 기본값 (SSOT). */
export function createSecureWebPreferences(
  preloadPath: string,
): WebPreferences {
  return {
    preload: preloadPath,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
  };
}

export function createSecureWindowOptions(
  preloadPath: string,
  extras: Omit<BrowserWindowConstructorOptions, "webPreferences">,
): BrowserWindowConstructorOptions {
  return {
    ...extras,
    webPreferences: createSecureWebPreferences(preloadPath),
  };
}

export function isDangerousUrl(urlString: string): boolean {
  const lower = urlString.trim().toLowerCase();
  return (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
  );
}
