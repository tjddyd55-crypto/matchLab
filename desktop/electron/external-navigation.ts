import { shell, type BrowserWindow, type HandlerDetails } from "electron";
import { isAllowedMatchonUrl, isExternalUrl } from "./config";
import { isDangerousUrl } from "./security";

const DESKTOP_LOGIN_PATH = "/desktop/login";

function isDesktopLoginUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    return u.pathname === DESKTOP_LOGIN_PATH || u.pathname === `${DESKTOP_LOGIN_PATH}/`;
  } catch {
    return false;
  }
}

async function openInSystemBrowser(url: string): Promise<void> {
  if (isDangerousUrl(url)) return;
  if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url)) {
    return;
  }
  await shell.openExternal(url);
}

export function attachNavigationGuards(win: BrowserWindow): void {
  win.webContents.on("will-navigate", (event, url) => {
    if (isDangerousUrl(url)) {
      event.preventDefault();
      return;
    }
    if (isAllowedMatchonUrl(url)) return;
    event.preventDefault();
    void openInSystemBrowser(url);
  });

  // login boundary 진입 시 뒤로가기 스택 제거 (renderer clear와 이중 안전)
  win.webContents.on("did-navigate", (_event, url) => {
    if (!isDesktopLoginUrl(url)) return;
    if (win.webContents.isDestroyed()) return;
    win.webContents.clearHistory();
  });

  win.webContents.setWindowOpenHandler((details: HandlerDetails) => {
    const url = details.url;
    if (isDangerousUrl(url)) {
      return { action: "deny" };
    }
    if (isExternalUrl(url) || !isAllowedMatchonUrl(url)) {
      void openInSystemBrowser(url);
      return { action: "deny" };
    }
    // 내부 MATCHON URL의 target=_blank — 새 창 대신 현재 창에서 이동하지 않고 거부 후 현재 창 navigate
    void win.loadURL(url);
    return { action: "deny" };
  });
}

export async function openExternalSafe(url: string): Promise<boolean> {
  if (isDangerousUrl(url)) return false;
  if (!isExternalUrl(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url)) {
    return false;
  }
  try {
    await openInSystemBrowser(url);
    return true;
  } catch {
    return false;
  }
}
