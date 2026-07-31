/**
 * MATCHON Manager 자동 업데이트 확장 포인트.
 *
 * 기본값: 비활성. 실제 feed/서명 준비가 끝나면
 * MATCHON_DESKTOP_AUTO_UPDATE=1 과 electron-updater 의존성으로 활성화한다.
 *
 * 인증서/업데이트 서버가 없는 지금은 반쯤 동작하는 UX를 켜지 않는다.
 */
import { app } from "electron";

export type AutoUpdateInitResult = {
  enabled: boolean;
  reason: string;
};

/**
 * packaged 앱에서만 검토. 현재는 명시적 opt-in 없으면 no-op.
 */
export function initAutoUpdate(): AutoUpdateInitResult {
  if (!app.isPackaged) {
    return { enabled: false, reason: "development" };
  }
  if (process.env.MATCHON_DESKTOP_AUTO_UPDATE !== "1") {
    return { enabled: false, reason: "disabled_by_default" };
  }

  // 향후:
  //   import { autoUpdater } from "electron-updater";
  //   autoUpdater.setFeedURL({ provider: "generic", url: process.env.MATCHON_DESKTOP_UPDATE_FEED_URL });
  //   autoUpdater.checkForUpdatesAndNotify();
  console.info(
    "[matchon-manager] auto-update opted in but updater not wired yet — Stage PC-2+",
  );
  return { enabled: false, reason: "stub_not_wired" };
}
