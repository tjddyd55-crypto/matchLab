/**
 * MATCHON Manager 자동 업데이트 (main process).
 *
 * 채널 분리:
 * - native: electron-updater → quitAndInstall(true, true) 만
 * - web: /api/desktop/version 비교 → webContents.reload() 만
 *
 * renderer에는 상태/version/progress 만 전달 (env·feed URL·stack 금지).
 */
import { app, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { getDesktopBaseUrl } from "./config";
import {
  loadAppliedWebVersion,
  saveAppliedWebVersion,
} from "./web-version-store";

export type NativeUpdateStatus =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "up_to_date"
  | "error";

export type WebUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "refreshing"
  | "up_to_date"
  | "error";

export type NativeUpdateSnapshot = {
  status: NativeUpdateStatus;
  enabled: boolean;
  currentVersion: string;
  availableVersion: string | null;
  progressPercent: number | null;
};

export type WebUpdateSnapshot = {
  status: WebUpdateStatus;
  currentVersion: string | null;
  availableVersion: string | null;
};

/**
 * preload / renderer 계약.
 * - native / web 채널 분리
 * - message 는 항상 null
 * - state 는 UI 우선순위용 파생 필드 (하위 호환)
 */
export type UpdateStatusSnapshot = {
  native: NativeUpdateSnapshot;
  web: WebUpdateSnapshot;
  /** UI 우선순위 파생 상태 (하위 호환) */
  state: NativeUpdateStatus | "web_available" | "web_refreshing";
  enabled: boolean;
  currentVersion: string;
  availableVersion: string | null;
  progressPercent: number | null;
  /** @deprecated UI에 쓰지 않음. 항상 null. */
  message: string | null;
};

const CHANNEL = "desktop:update-status";
const NATIVE_PERIODIC_MS = 4 * 60 * 60 * 1000;
const WEB_PERIODIC_MS = 15 * 60 * 1000;
const LOG_PREFIX = "[desktop-updater]";

let native: NativeUpdateSnapshot = {
  status: "disabled",
  enabled: false,
  currentVersion: "0.0.0",
  availableVersion: null,
  progressPercent: null,
};

let web: WebUpdateSnapshot = {
  status: "idle",
  currentVersion: null,
  availableVersion: null,
};

let wiredNative = false;
let nativeTimer: NodeJS.Timeout | null = null;
let webTimer: NodeJS.Timeout | null = null;
/** 프로세스당 시작 자동 reload 1회 */
let startupWebReloadDone = false;
/** 이미 자동 reload 적용한 서버 버전 — 동일 버전 재적용 금지 */
let lastAutoReloadedVersion: string | null = null;
let applyingWebReload = false;

function isUsableWebVersion(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function deriveCompatState(): UpdateStatusSnapshot["state"] {
  if (native.status === "ready") return "ready";
  if (native.status === "downloading") return "downloading";
  if (native.status === "available") return "available";
  if (web.status === "refreshing") return "web_refreshing";
  if (web.status === "available") return "web_available";
  if (native.status === "checking" || web.status === "checking") {
    return "checking";
  }
  if (native.status === "error" || web.status === "error") return "error";
  if (native.status === "disabled" && web.status === "up_to_date") {
    return "up_to_date";
  }
  if (native.status === "up_to_date" || web.status === "up_to_date") {
    return "up_to_date";
  }
  if (native.status === "idle") return "idle";
  return native.status;
}

function buildSnapshot(): UpdateStatusSnapshot {
  return {
    native: {
      ...native,
      currentVersion: app.getVersion(),
    },
    web: { ...web },
    state: deriveCompatState(),
    enabled: native.enabled,
    currentVersion: app.getVersion(),
    availableVersion: native.availableVersion ?? web.availableVersion ?? null,
    progressPercent: native.progressPercent,
    message: null,
  };
}

function publish(): UpdateStatusSnapshot {
  const snapshot = buildSnapshot();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(CHANNEL, snapshot);
    }
  }
  return snapshot;
}

function logInternal(level: "warn" | "error", detail: string): void {
  if (level === "error") {
    console.error(`${LOG_PREFIX} ${detail}`);
    return;
  }
  console.warn(`${LOG_PREFIX} ${detail}`);
}

function resolveFeedUrl(): string | null {
  const fromEnv = process.env.MATCHON_DESKTOP_UPDATE_FEED_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return null;
}

function shouldEnableNativeUpdater():
  | { ok: true; feedUrl: string }
  | {
      ok: false;
      reason: "development" | "explicitly_disabled" | "missing_feed_url";
    } {
  if (!app.isPackaged) {
    return { ok: false, reason: "development" };
  }
  if (process.env.MATCHON_DESKTOP_AUTO_UPDATE === "0") {
    return { ok: false, reason: "explicitly_disabled" };
  }
  const feedUrl = resolveFeedUrl();
  if (!feedUrl) {
    return { ok: false, reason: "missing_feed_url" };
  }
  return { ok: true, feedUrl };
}

function wireNativeEvents(): void {
  if (wiredNative) return;
  wiredNative = true;

  autoUpdater.on("checking-for-update", () => {
    native = {
      ...native,
      status: "checking",
      progressPercent: null,
    };
    publish();
  });

  autoUpdater.on("update-available", (info) => {
    native = {
      ...native,
      status: "available",
      availableVersion: info.version ?? null,
      progressPercent: 0,
    };
    publish();
  });

  autoUpdater.on("update-not-available", () => {
    native = {
      ...native,
      status: "up_to_date",
      availableVersion: null,
      progressPercent: null,
    };
    publish();
  });

  autoUpdater.on("download-progress", (progress) => {
    native = {
      ...native,
      status: "downloading",
      progressPercent:
        typeof progress.percent === "number" ? progress.percent : null,
    };
    publish();
  });

  autoUpdater.on("update-downloaded", (info) => {
    native = {
      ...native,
      status: "ready",
      availableVersion: info.version ?? native.availableVersion,
      progressPercent: 100,
    };
    publish();
  });

  autoUpdater.on("error", (err) => {
    const detail =
      err instanceof Error ? err.message : "unknown updater error";
    logInternal("error", detail);
    native = {
      ...native,
      status: "error",
      progressPercent: null,
    };
    publish();
  });
}

async function fetchRemoteWebVersion(): Promise<{
  webVersion: string;
  desktopMinimumVersion: string | null;
} | null> {
  try {
    const url = `${getDesktopBaseUrl()}/api/desktop/version`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Matchon-Desktop": "1",
      },
    });
    if (!res.ok) {
      logInternal("warn", `web version http ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      webVersion?: unknown;
      desktopMinimumVersion?: unknown;
    };
    if (typeof data.webVersion !== "string" || !data.webVersion.trim()) {
      return null;
    }
    return {
      webVersion: data.webVersion.trim(),
      desktopMinimumVersion:
        typeof data.desktopMinimumVersion === "string"
          ? data.desktopMinimumVersion.trim()
          : null,
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "web version fetch failed";
    logInternal("warn", detail);
    return null;
  }
}

function getMainWindow(): BrowserWindow | null {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  const all = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  return all[0] ?? null;
}

async function injectOverlay(win: BrowserWindow, text: string): Promise<void> {
  const safe = JSON.stringify(text);
  await win.webContents.executeJavaScript(
    `(() => {
      let el = document.getElementById("__matchon_web_update_overlay");
      if (!el) {
        el = document.createElement("div");
        el.id = "__matchon_web_update_overlay";
        el.setAttribute("role", "status");
        el.style.cssText = "position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(248,250,252,0.88);font:600 15px/1.4 system-ui,sans-serif;color:#001C7A;";
        document.documentElement.appendChild(el);
      }
      el.textContent = ${safe};
    })();`,
    true,
  );
}

async function persistScrollBeforeReload(win: BrowserWindow): Promise<void> {
  await win.webContents.executeJavaScript(
    `(() => {
      try {
        sessionStorage.setItem("__matchon_scroll_y", String(window.scrollY || 0));
        sessionStorage.setItem(
          "__matchon_scroll_path",
          location.pathname + location.search + location.hash,
        );
        const containers = [];
        document
          .querySelectorAll(
            '[data-testid="schedule-week-scroll"], [data-matchon-scroll]',
          )
          .forEach((el) => {
            const key =
              el.getAttribute("data-testid") ||
              el.getAttribute("data-matchon-scroll") ||
              el.id;
            if (!key) return;
            containers.push({
              key,
              top: el.scrollTop || 0,
              left: el.scrollLeft || 0,
            });
          });
        sessionStorage.setItem(
          "__matchon_scroll_containers",
          JSON.stringify(containers),
        );
      } catch (_) {}
    })();`,
    true,
  );
}

async function restoreScrollAfterReload(win: BrowserWindow): Promise<void> {
  await win.webContents.executeJavaScript(
    `(() => {
      try {
        const path = sessionStorage.getItem("__matchon_scroll_path");
        const y = Number(sessionStorage.getItem("__matchon_scroll_y") || "0");
        const raw = sessionStorage.getItem("__matchon_scroll_containers");
        sessionStorage.removeItem("__matchon_scroll_path");
        sessionStorage.removeItem("__matchon_scroll_y");
        sessionStorage.removeItem("__matchon_scroll_containers");
        const current =
          location.pathname + location.search + location.hash;
        if (path !== current) return;
        if (Number.isFinite(y) && y > 0) {
          window.scrollTo(0, y);
        }
        const containers = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(containers)) return;
        const apply = () => {
          for (const item of containers) {
            if (!item || typeof item.key !== "string") continue;
            const el =
              document.querySelector('[data-testid="' + item.key + '"]') ||
              document.querySelector('[data-matchon-scroll="' + item.key + '"]') ||
              document.getElementById(item.key);
            if (el) {
              el.scrollTop = Number(item.top) || 0;
              el.scrollLeft = Number(item.left) || 0;
            }
          }
        };
        apply();
        requestAnimationFrame(apply);
        setTimeout(apply, 120);
      } catch (_) {}
    })();`,
    true,
  );
}

export function getUpdateStatus(): UpdateStatusSnapshot {
  return buildSnapshot();
}

export async function checkNativeUpdatesNow(): Promise<UpdateStatusSnapshot> {
  if (!native.enabled) {
    native = {
      ...native,
      status: "disabled",
      enabled: false,
    };
    return publish();
  }

  try {
    native = {
      ...native,
      status: "checking",
      progressPercent: null,
    };
    publish();
    await autoUpdater.checkForUpdates();
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "checkForUpdates failed";
    logInternal("error", detail);
    native = {
      ...native,
      status: "error",
      progressPercent: null,
    };
    publish();
  }
  return getUpdateStatus();
}

/**
 * 서버 webVersion과 로컬 적용 버전을 비교한다.
 * @param opts.autoReloadIfStale 시작 시 1회 reload 허용
 */
export async function checkWebUpdatesNow(opts?: {
  autoReloadIfStale?: boolean;
}): Promise<UpdateStatusSnapshot> {
  web = {
    ...web,
    status: "checking",
  };
  publish();

  const remote = await fetchRemoteWebVersion();
  if (!remote || !isUsableWebVersion(remote.webVersion)) {
    // endpoint 실패·빈 version → reload 금지
    web = {
      ...web,
      status: "error",
    };
    return publish();
  }

  const remoteVersion = remote.webVersion.trim();
  const applied = loadAppliedWebVersion();
  web = {
    ...web,
    currentVersion: applied?.webVersion ?? null,
    availableVersion: remoteVersion,
  };

  if (!applied || !isUsableWebVersion(applied.webVersion)) {
    // 저장 없음/손상 → 안전하게 기록만 하고 reload하지 않음 (루프 방지)
    saveAppliedWebVersion(remoteVersion);
    web = {
      status: "up_to_date",
      currentVersion: remoteVersion,
      availableVersion: remoteVersion,
    };
    return publish();
  }

  if (applied.webVersion === remoteVersion) {
    web = {
      status: "up_to_date",
      currentVersion: remoteVersion,
      availableVersion: remoteVersion,
    };
    return publish();
  }

  web = {
    status: "available",
    currentVersion: applied.webVersion,
    availableVersion: remoteVersion,
  };
  publish();

  const canAutoReload =
    Boolean(opts?.autoReloadIfStale) &&
    !startupWebReloadDone &&
    !applyingWebReload &&
    lastAutoReloadedVersion !== remoteVersion;

  if (canAutoReload) {
    startupWebReloadDone = true;
    lastAutoReloadedVersion = remoteVersion;
    await applyWebUpdateNow({ silent: true });
  }

  return getUpdateStatus();
}

export async function checkForUpdatesNow(): Promise<UpdateStatusSnapshot> {
  await Promise.all([checkNativeUpdatesNow(), checkWebUpdatesNow()]);
  return getUpdateStatus();
}

/**
 * 웹만 새로고침. quitAndInstall 금지.
 */
export async function applyWebUpdateNow(opts?: {
  silent?: boolean;
}): Promise<boolean> {
  const win = getMainWindow();
  if (!win) return false;
  if (applyingWebReload) return false;

  applyingWebReload = true;
  web = {
    ...web,
    status: "refreshing",
  };
  publish();

  try {
    if (!opts?.silent) {
      await injectOverlay(win, "화면을 새로고침하고 있습니다.");
      await new Promise((r) => setTimeout(r, 180));
    }
    await persistScrollBeforeReload(win);

    await new Promise<void>((resolve) => {
      const onDone = () => {
        win.webContents.removeListener("did-finish-load", onDone);
        resolve();
      };
      win.webContents.once("did-finish-load", onDone);
      win.webContents.reload();
      // safety timeout
      setTimeout(() => {
        win.webContents.removeListener("did-finish-load", onDone);
        resolve();
      }, 20000);
    });

    const remote = await fetchRemoteWebVersion();
    if (remote && isUsableWebVersion(remote.webVersion)) {
      const version = remote.webVersion.trim();
      const saved = saveAppliedWebVersion(version);
      if (!saved) {
        // 로컬 저장 실패 시 무한 reload 방지
        web = {
          status: "available",
          currentVersion: web.currentVersion,
          availableVersion: version,
        };
        publish();
        return false;
      }
      lastAutoReloadedVersion = version;
      web = {
        status: "up_to_date",
        currentVersion: version,
        availableVersion: version,
      };
    } else {
      web = {
        ...web,
        status: "error",
      };
    }
    await restoreScrollAfterReload(win);
    publish();
    return web.status === "up_to_date";
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "web reload failed";
    logInternal("error", detail);
    web = {
      ...web,
      status: "error",
    };
    publish();
    return false;
  } finally {
    applyingWebReload = false;
  }
}

/**
 * Desktop binary 업데이트만. ready 가 아니면 false.
 */
export function installDesktopUpdateNow(): boolean {
  if (native.status !== "ready") {
    return false;
  }
  autoUpdater.quitAndInstall(true, true);
  return true;
}

/** @deprecated alias — native install only */
export function installUpdateNow(): boolean {
  return installDesktopUpdateNow();
}

export function attachWebUpdateLifecycle(
  getWindow: () => BrowserWindow | null,
): void {
  app.on("browser-window-focus", () => {
    void checkWebUpdatesNow();
  });

  const win = getWindow();
  if (!win || win.isDestroyed()) return;

  const runStartupCheck = () => {
    void checkWebUpdatesNow({ autoReloadIfStale: true });
  };

  if (win.webContents.isLoadingMainFrame()) {
    win.webContents.once("did-finish-load", runStartupCheck);
  } else {
    runStartupCheck();
  }
}

/**
 * packaged 앱 native updater + web version watcher 초기화.
 */
export function initAutoUpdate(): UpdateStatusSnapshot {
  native = {
    status: "disabled",
    enabled: false,
    currentVersion: app.getVersion(),
    availableVersion: null,
    progressPercent: null,
  };
  web = {
    status: "idle",
    currentVersion: loadAppliedWebVersion()?.webVersion ?? null,
    availableVersion: null,
  };

  const gate = shouldEnableNativeUpdater();
  if (!gate.ok) {
    if (gate.reason === "missing_feed_url") {
      logInternal("warn", "update feed is not configured");
    } else if (gate.reason === "development") {
      logInternal("warn", "updater disabled in development build");
    } else if (gate.reason === "explicitly_disabled") {
      logInternal("warn", "updater explicitly disabled");
    }
    native = {
      ...native,
      status: "disabled",
      enabled: false,
    };
  } else {
    try {
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = false;
      autoUpdater.setFeedURL({ provider: "generic", url: gate.feedUrl });
      wireNativeEvents();
      native = {
        ...native,
        status: "idle",
        enabled: true,
      };
      void checkNativeUpdatesNow();
      if (nativeTimer) clearInterval(nativeTimer);
      nativeTimer = setInterval(() => {
        void checkNativeUpdatesNow();
      }, NATIVE_PERIODIC_MS);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "failed to init updater";
      logInternal("error", detail);
      native = {
        ...native,
        status: "disabled",
        enabled: false,
      };
    }
  }

  if (webTimer) clearInterval(webTimer);
  webTimer = setInterval(() => {
    void checkWebUpdatesNow();
  }, WEB_PERIODIC_MS);

  return publish();
}
