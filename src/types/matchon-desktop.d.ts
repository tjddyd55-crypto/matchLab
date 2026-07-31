export type MatchonDesktopUpdateState =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "up_to_date"
  | "error";

export type MatchonDesktopUpdateStatus = {
  state: MatchonDesktopUpdateState;
  enabled: boolean;
  currentVersion: string;
  availableVersion: string | null;
  progressPercent: number | null;
  message: string | null;
};

export type MatchonDesktopBridge = {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  retryConnection: () => Promise<boolean>;
  isDesktopApp: () => boolean;
  getUpdateStatus?: () => Promise<MatchonDesktopUpdateStatus>;
  checkForUpdates?: () => Promise<MatchonDesktopUpdateStatus>;
  installUpdate?: () => Promise<boolean>;
  subscribeUpdateStatus?: (
    callback: (status: MatchonDesktopUpdateStatus) => void,
  ) => () => void;
};

declare global {
  interface Window {
    matchonDesktop?: MatchonDesktopBridge;
  }
}

export {};
