import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { UpdateStatusSnapshot } from "./auto-update";

/**
 * Renderer에 노출하는 최소 bridge.
 * 파일시스템·shell 임의 실행·env·cookie 원문 접근 금지.
 */
const bridge = {
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke("desktop:get-app-version"),
  getPlatform: (): Promise<string> =>
    ipcRenderer.invoke("desktop:get-platform"),
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke("desktop:open-external", url),
  retryConnection: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:retry-connection"),
  isDesktopApp: (): boolean => true,
  getUpdateStatus: (): Promise<UpdateStatusSnapshot> =>
    ipcRenderer.invoke("desktop:get-update-status"),
  checkForUpdates: (): Promise<UpdateStatusSnapshot> =>
    ipcRenderer.invoke("desktop:check-for-updates"),
  installUpdate: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:install-update"),
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
