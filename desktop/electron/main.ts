import { app, BrowserWindow, ipcMain, session, nativeImage } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { initAutoUpdate } from "./auto-update";
import {
  DESKTOP_ENTRY_PATH,
  getDesktopBaseUrl,
  getDesktopEnvironmentName,
  SESSION_PARTITION,
} from "./config";
import { attachNavigationGuards, openExternalSafe } from "./external-navigation";
import {
  attachWindowStatePersistence,
  loadWindowState,
} from "./window-state";

const DESKTOP_HEADER = "X-Matchon-Desktop";
let mainWindow: BrowserWindow | null = null;
let sessionConfigured = false;

function appVersion(): string {
  return app.getVersion();
}

function resolveAppIconPath(): string | undefined {
  const candidates = [
    join(__dirname, "..", "assets", "icon.ico"),
    join(__dirname, "..", "assets", "icon.png"),
    join(process.resourcesPath, "assets", "icon.ico"),
  ];
  return candidates.find((p) => existsSync(p));
}

function buildUserAgent(base: string): string {
  return `${base} MATCHON-Manager/${appVersion()}`;
}

function entryUrl(): string {
  return `${getDesktopBaseUrl()}${DESKTOP_ENTRY_PATH}`;
}

function connectionErrorUrl(): string {
  const file = join(__dirname, "connection-error.html");
  const q = new URLSearchParams({
    v: appVersion(),
    env: getDesktopEnvironmentName(),
  });
  return `file://${file.replace(/\\/g, "/")}?${q.toString()}`;
}

function configureSession(): void {
  if (sessionConfigured) return;
  sessionConfigured = true;
  const ses = session.fromPartition(SESSION_PARTITION, { cache: true });
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    headers[DESKTOP_HEADER] = "1";
    callback({ requestHeaders: headers });
  });
}

async function loadEntry(win: BrowserWindow): Promise<void> {
  try {
    await win.loadURL(entryUrl());
  } catch {
    await win.loadURL(connectionErrorUrl());
  }
}

function createMainWindow(): BrowserWindow {
  const state = loadWindowState();
  const preloadPath = join(__dirname, "preload.js");
  const iconPath = resolveAppIconPath();
  configureSession();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#F8FAFC",
    title: `MATCHON Manager v${appVersion()}`,
    autoHideMenuBar: true,
    ...(iconPath
      ? { icon: nativeImage.createFromPath(iconPath) }
      : {}),
    webPreferences: {
      preload: preloadPath,
      partition: SESSION_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  win.webContents.setUserAgent(buildUserAgent(win.webContents.getUserAgent()));

  // 웹 document.title이 창 제목을 덮어쓰지 않도록 Manager 버전 유지
  win.on("page-title-updated", (event) => {
    event.preventDefault();
    win.setTitle(`MATCHON Manager v${appVersion()}`);
  });

  attachNavigationGuards(win);
  attachWindowStatePersistence(win);

  win.once("ready-to-show", () => {
    if (state.maximized) win.maximize();
    win.show();
  });

  win.webContents.on("did-fail-load", (_e, errorCode, _desc, validatedURL) => {
    if (errorCode === -3) return;
    if (validatedURL.startsWith("file:")) return;
    void win.loadURL(connectionErrorUrl());
  });

  if (app.isPackaged) {
    win.webContents.on("before-input-event", (event, input) => {
      const key = input.key.toLowerCase();
      if (
        key === "f12" ||
        (input.control && input.shift && (key === "i" || key === "j"))
      ) {
        event.preventDefault();
      }
    });
  }

  void loadEntry(win);
  return win;
}

function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function registerIpc(): void {
  ipcMain.handle("desktop:get-app-version", () => appVersion());
  ipcMain.handle("desktop:get-platform", () => process.platform);
  ipcMain.handle("desktop:open-external", async (_e, url: unknown) => {
    if (typeof url !== "string") return false;
    return openExternalSafe(url);
  });
  ipcMain.handle("desktop:retry-connection", async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createMainWindow();
      return true;
    }
    await loadEntry(mainWindow);
    return true;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    registerIpc();
    initAutoUpdate();
    mainWindow = createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
