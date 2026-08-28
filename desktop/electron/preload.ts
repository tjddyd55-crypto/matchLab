import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { UpdateStatusSnapshot } from "./auto-update";

/**
 * Renderer에 노출하는 최소 bridge.
 * 파일시스템·shell 임의 실행·env·원문 인증정보 접근 금지.
 * 임의 URL reload / update feed 변경 API 없음.
 */
const bridge = {
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke("desktop:get-app-version"),
  getTitleBarMode: (): Promise<"overlay" | "native"> =>
    ipcRenderer.invoke("desktop:get-titlebar-mode"),
  canNavigateBack: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:can-navigate-back"),
  navigateBack: (): Promise<{ action: "back" | "none" }> =>
    ipcRenderer.invoke("desktop:navigate-back"),
  getPlatform: (): Promise<string> =>
    ipcRenderer.invoke("desktop:get-platform"),
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke("desktop:open-external", url),
  retryConnection: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:retry-connection"),
  isDesktopApp: (): boolean => true,
  clearNavigationHistory: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:clear-navigation-history"),
  getUpdateStatus: (): Promise<UpdateStatusSnapshot> =>
    ipcRenderer.invoke("desktop:get-update-status"),
  checkForUpdates: (): Promise<UpdateStatusSnapshot> =>
    ipcRenderer.invoke("desktop:check-for-updates"),
  applyWebUpdate: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:apply-web-update"),
  installDesktopUpdate: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:install-desktop-update"),
  /** @deprecated native install alias */
  installUpdate: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:install-desktop-update"),
  subscribeUpdateStatus: (
    callback: (status: UpdateStatusSnapshot) => void,
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      status: UpdateStatusSnapshot,
    ) => {
      callback(status);
    };
    ipcRenderer.on("desktop:update-status", listener);
    return () => {
      ipcRenderer.removeListener("desktop:update-status", listener);
    };
  },
};

contextBridge.exposeInMainWorld("matchonDesktop", bridge);
