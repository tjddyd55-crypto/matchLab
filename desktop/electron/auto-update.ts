/**
 * MATCHON Manager 자동 업데이트 (main process).
 *
 * - packaged + feed URL 있을 때만 electron-updater 동작
 * - renderer에는 state / version / progress 만 전달 (환경변수·feed URL·stack 금지)
 * - 내부 사유는 console.warn 으로만 남긴다
 * - autoDownload=true, autoInstallOnAppQuit=false
 * - 적용은 사용자가 "업데이트 적용" 클릭 시 quitAndInstall(true, true)
 */
import { app, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";

export type UpdateUiState =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "up_to_date"
  | "error";

/** preload / renderer 계약. message 필드는 하위 호환용이며 항상 null. */
export type UpdateStatusSnapshot = {
  state: UpdateUiState;
  enabled: boolean;
  currentVersion: string;
  availableVersion: string | null;
  progressPercent: number | null;
  /** @deprecated UI에 쓰지 않음. 항상 null. */
  message: string | null;
};

const CHANNEL = "desktop:update-status";
const PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000;
const LOG_PREFIX = "[desktop-updater]";

let snapshot: UpdateStatusSnapshot = {
  state: "disabled",
  enabled: false,
  currentVersion: "0.0.0",
  availableVersion: null,
  progressPercent: null,
  message: null,
};

let wired = false;
let periodicTimer: NodeJS.Timeout | null = null;

function publish(next: Partial<UpdateStatusSnapshot>): UpdateStatusSnapshot {
  snapshot = {
    ...snapshot,
    ...next,
    currentVersion: app.getVersion(),
    // renderer로 내부 문구가 새지 않도록 강제
    message: null,
  };
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

function shouldEnableUpdater():
  | { ok: true; feedUrl: string }
  | { ok: false; reason: "development" | "explicitly_disabled" | "missing_feed_url" } {
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

function wireUpdaterEvents(): void {
  if (wired) return;
  wired = true;

  autoUpdater.on("checking-for-update", () => {
    publish({
      state: "checking",
      progressPercent: null,
    });
  });

  autoUpdater.on("update-available", (info) => {
    publish({
      state: "available",
      availableVersion: info.version ?? null,
      progressPercent: 0,
    });
  });

  autoUpdater.on("update-not-available", () => {
    publish({
      state: "up_to_date",
      availableVersion: null,
      progressPercent: null,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    publish({
      state: "downloading",
      progressPercent:
        typeof progress.percent === "number" ? progress.percent : null,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    publish({
      state: "ready",
      availableVersion: info.version ?? snapshot.availableVersion,
      progressPercent: 100,
    });
  });

  autoUpdater.on("error", (err) => {
    const detail =
      err instanceof Error ? err.message : "unknown updater error";
    logInternal("error", detail);
    publish({
      state: "error",
      progressPercent: null,
    });
  });
}

export function getUpdateStatus(): UpdateStatusSnapshot {
  return {
    ...snapshot,
    currentVersion: app.getVersion(),
    message: null,
  };
}

export async function checkForUpdatesNow(): Promise<UpdateStatusSnapshot> {
  if (!snapshot.enabled) {
    return publish({
      state: "disabled",
      enabled: false,
    });
  }

  try {
    publish({ state: "checking", progressPercent: null });
    await autoUpdater.checkForUpdates();
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "checkForUpdates failed";
    logInternal("error", detail);
    publish({ state: "error", progressPercent: null });
  }
  return getUpdateStatus();
}

export function installUpdateNow(): boolean {
  if (snapshot.state !== "ready") {
    return false;
  }
  // oneClick:false NSIS는 isSilent=false면 설치 마법사가 떠서 자동 적용이 멈춘다.
  autoUpdater.quitAndInstall(true, true);
  return true;
}

/**
 * packaged 앱에서 feed URL이 있으면 updater를 연결한다.
 * 실패해도 앱은 계속 실행된다.
 */
export function initAutoUpdate(): UpdateStatusSnapshot {
  snapshot = {
    state: "disabled",
    enabled: false,
    currentVersion: app.getVersion(),
    availableVersion: null,
    progressPercent: null,
    message: null,
  };

  const gate = shouldEnableUpdater();
  if (!gate.ok) {
    if (gate.reason === "missing_feed_url") {
      logInternal("warn", "update feed is not configured");
    } else if (gate.reason === "development") {
      logInternal("warn", "updater disabled in development build");
    } else if (gate.reason === "explicitly_disabled") {
      logInternal("warn", "updater explicitly disabled");
    }
    // UI: disabled → "최신 버전입니다" (사용자에게 내부 사유 비노출)
    return publish({
      state: "disabled",
      enabled: false,
    });
  }

  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.setFeedURL({ provider: "generic", url: gate.feedUrl });
    wireUpdaterEvents();

    publish({
      state: "idle",
      enabled: true,
    });

    void checkForUpdatesNow();

    if (periodicTimer) clearInterval(periodicTimer);
    periodicTimer = setInterval(() => {
      void checkForUpdatesNow();
    }, PERIODIC_CHECK_MS);

    return getUpdateStatus();
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "failed to init updater";
    logInternal("error", detail);
    return publish({
      state: "disabled",
      enabled: false,
    });
  }
}
