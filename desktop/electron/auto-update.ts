/**
 * MATCHON Manager 자동 업데이트.
 *
 * - packaged + feed URL 있을 때만 실제 electron-updater 동작
 * - feed/opt-in 없으면 enabled=false 상태만 유지 (앱 크래시 금지)
 * - autoDownload=true, autoInstallOnAppQuit=false
 * - 적용은 사용자가 "업데이트 적용" 클릭 시 quitAndInstall()
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

export type UpdateStatusSnapshot = {
  state: UpdateUiState;
  enabled: boolean;
  currentVersion: string;
  availableVersion: string | null;
  progressPercent: number | null;
  message: string | null;
};

const CHANNEL = "desktop:update-status";
const PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000;

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
  };
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(CHANNEL, snapshot);
    }
  }
  return snapshot;
}

function resolveFeedUrl(): string | null {
  const fromEnv = process.env.MATCHON_DESKTOP_UPDATE_FEED_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return null;
}

function shouldEnableUpdater():
  | { ok: true; feedUrl: string }
  | { ok: false; reason: string } {
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
      message: "업데이트를 확인하는 중",
      progressPercent: null,
    });
  });

  autoUpdater.on("update-available", (info) => {
    publish({
      state: "available",
      availableVersion: info.version ?? null,
      message: "새 버전이 있습니다. 다운로드를 시작합니다.",
      progressPercent: 0,
    });
  });

  autoUpdater.on("update-not-available", () => {
    publish({
      state: "up_to_date",
      availableVersion: null,
      progressPercent: null,
      message: "최신 버전입니다.",
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    publish({
      state: "downloading",
      progressPercent:
        typeof progress.percent === "number" ? progress.percent : null,
      message: "업데이트를 다운로드하는 중",
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    publish({
      state: "ready",
      availableVersion: info.version ?? snapshot.availableVersion,
      progressPercent: 100,
      message: "다운로드 완료. 적용을 누르면 앱이 재시작됩니다.",
    });
  });

  autoUpdater.on("error", (err) => {
    publish({
      state: "error",
      message: err?.message || "업데이트 확인 중 오류가 발생했습니다.",
      progressPercent: null,
    });
  });
}

export function getUpdateStatus(): UpdateStatusSnapshot {
  return {
    ...snapshot,
    currentVersion: app.getVersion(),
  };
}

export async function checkForUpdatesNow(): Promise<UpdateStatusSnapshot> {
  if (!snapshot.enabled) {
    return publish({
      state: "disabled",
      enabled: false,
      message: snapshot.message ?? "업데이트가 비활성 상태입니다.",
    });
  }

  try {
    publish({ state: "checking", message: "업데이트를 확인하는 중" });
    await autoUpdater.checkForUpdates();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "업데이트 확인 중 오류가 발생했습니다.";
    publish({ state: "error", message, progressPercent: null });
  }
  return getUpdateStatus();
}

export function installUpdateNow(): boolean {
  if (snapshot.state !== "ready") {
    return false;
  }
  // oneClick:false NSIS는 isSilent=false면 설치 마법사가 떠서 자동 적용이 멈춘다.
  // 사용자가 UI에서 이미 재시작 확인을 했으므로 silent + forceRunAfter.
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
    const messageByReason: Record<string, string> = {
      development: "개발 빌드에서는 자동 업데이트가 비활성입니다.",
      explicitly_disabled: "업데이트를 사용할 수 없습니다.",
      missing_feed_url: "최신 버전 확인이 준비되지 않았습니다.",
    };
    return publish({
      state: "disabled",
      enabled: false,
      message: messageByReason[gate.reason] ?? "업데이트가 비활성입니다.",
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
      message: null,
    });

    void checkForUpdatesNow();

    if (periodicTimer) clearInterval(periodicTimer);
    periodicTimer = setInterval(() => {
      void checkForUpdatesNow();
    }, PERIODIC_CHECK_MS);

    return getUpdateStatus();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "업데이트 모듈을 불러오지 못했습니다.";
    return publish({
      state: "disabled",
      enabled: false,
      message,
    });
  }
}
