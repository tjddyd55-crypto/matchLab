export type MatchonNativeUpdateStatus =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "up_to_date"
  | "error";

export type MatchonWebUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "refreshing"
  | "up_to_date"
  | "error";

/** @deprecated 파생 state — native/web 필드를 우선 사용 */
export type MatchonDesktopUpdateState =
  | MatchonNativeUpdateStatus
  | "web_available"
  | "web_refreshing";

export type MatchonDesktopUpdateStatus = {
  native: {
    status: MatchonNativeUpdateStatus;
    enabled: boolean;
    currentVersion: string;
    availableVersion: string | null;
    progressPercent: number | null;
  };
  web: {
    status: MatchonWebUpdateStatus;
    currentVersion: string | null;
    availableVersion: string | null;
  };
  /** UI 우선순위 파생 (하위 호환) */
  state: MatchonDesktopUpdateState;
  enabled: boolean;
  currentVersion: string;
  availableVersion: string | null;
  progressPercent: number | null;
  /**
   * @deprecated UI에 사용하지 않음. main은 항상 null을 전달한다.
   */
  message: string | null;
};

export type MatchonDesktopBridge = {
  getAppVersion: () => Promise<string>;
  getTitleBarMode: () => Promise<"overlay" | "native">;
  canNavigateBack: () => Promise<boolean>;
  navigateBack: () => Promise<{ action: "back" | "none" }>;
  getPlatform: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  retryConnection: () => Promise<boolean>;
  isDesktopApp: () => boolean;
  /** 로그아웃·login boundary 진입 후 뒤로가기 스택 제거 */
  clearNavigationHistory?: () => Promise<boolean>;
  getUpdateStatus?: () => Promise<MatchonDesktopUpdateStatus>;
  checkForUpdates?: () => Promise<MatchonDesktopUpdateStatus>;
  /** 웹 화면만 reload. quitAndInstall 호출 안 함 */
  applyWebUpdate?: () => Promise<boolean>;
  /** Desktop binary silent install + restart */
  installDesktopUpdate?: () => Promise<boolean>;
  /** @deprecated installDesktopUpdate 와 동일 */
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
