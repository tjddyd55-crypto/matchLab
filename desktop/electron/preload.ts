import { contextBridge, ipcRenderer } from "electron";

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
};

contextBridge.exposeInMainWorld("matchonDesktop", bridge);
