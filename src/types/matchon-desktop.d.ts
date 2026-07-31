export type MatchonDesktopBridge = {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  retryConnection: () => Promise<boolean>;
  isDesktopApp: () => boolean;
};

declare global {
  interface Window {
    matchonDesktop?: MatchonDesktopBridge;
  }
}

export {};
