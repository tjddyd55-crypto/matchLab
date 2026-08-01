/**
 * MATCHON Manager 업데이트 상태 → 사용자 표시 문구 SSOT.
 * Header / desktop login 공통.
 * native(재시작) vs web(새로고침) 우선순위를 적용한다.
 */
import type { MatchonDesktopUpdateStatus } from "@/types/matchon-desktop";

export type DesktopUpdateDisplay = {
  label: string;
  tooltip: string | null;
  interactive: boolean;
  busy: boolean;
  emphasize: boolean;
  /** UI 액션 힌트 */
  action:
    | "none"
    | "check"
    | "apply_web"
    | "install_native"
    | "flash_latest";
};

function nativePercent(status: MatchonDesktopUpdateStatus): number | null {
  const p = status.native?.progressPercent ?? status.progressPercent;
  if (typeof p !== "number") return null;
  return Math.max(0, Math.min(100, Math.round(p)));
}

export function getDesktopUpdateDisplayState(
  status: MatchonDesktopUpdateStatus,
): DesktopUpdateDisplay {
  const nativeStatus = status.native?.status ?? status.state;
  const webStatus = status.web?.status ?? "idle";
  const appVersion =
    status.native?.currentVersion ?? status.currentVersion ?? "";
  const nativeAvailable =
    status.native?.availableVersion ?? status.availableVersion;

  // 1) Desktop ready
  if (nativeStatus === "ready") {
    return {
      label: "프로그램 업데이트",
      tooltip: nativeAvailable
        ? `프로그램 업데이트 v${appVersion} → v${nativeAvailable}. 적용을 위해 프로그램이 한 번 재시작됩니다.`
        : "적용을 위해 프로그램이 한 번 재시작됩니다.",
      interactive: true,
      busy: false,
      emphasize: true,
      action: "install_native",
    };
  }

  // 2) Desktop downloading
  if (nativeStatus === "downloading") {
    const p = nativePercent(status);
    return {
      label: p == null ? "다운로드 중" : `다운로드 중 ${p}%`,
      tooltip: "프로그램 업데이트를 내려받는 중입니다",
      interactive: false,
      busy: true,
      emphasize: false,
      action: "none",
    };
  }

  // 3) Desktop available (autoDownload 직전/직후)
  if (nativeStatus === "available") {
    return {
      label: "업데이트 준비",
      tooltip: nativeAvailable
        ? `프로그램 업데이트 v${nativeAvailable} 준비 중`
        : "프로그램 업데이트 준비 중",
      interactive: false,
      busy: false,
      emphasize: false,
      action: "none",
    };
  }

  // 4) Web refreshing
  if (webStatus === "refreshing") {
    return {
      label: "새로고침 중",
      tooltip: "화면을 새로고침하고 있습니다",
      interactive: false,
      busy: true,
      emphasize: false,
      action: "none",
    };
  }

  // 5) Web available
  if (webStatus === "available") {
    return {
      label: "업데이트",
      tooltip: "새로고침하면 바로 반영됩니다.",
      interactive: true,
      busy: false,
      emphasize: true,
      action: "apply_web",
    };
  }

  // 6) Checking
  if (nativeStatus === "checking" || webStatus === "checking") {
    return {
      label: "확인 중",
      tooltip: "업데이트를 확인하고 있습니다",
      interactive: false,
      busy: true,
      emphasize: false,
      action: "none",
    };
  }

  // 7) Error
  if (nativeStatus === "error" || webStatus === "error") {
    return {
      label: "다시 확인",
      tooltip: "업데이트를 다시 확인해 주세요",
      interactive: true,
      busy: false,
      emphasize: false,
      action: "check",
    };
  }

  // 8) Latest / disabled / idle
  if (
    nativeStatus === "disabled" ||
    nativeStatus === "up_to_date" ||
    webStatus === "up_to_date"
  ) {
    return {
      label: "최신 버전입니다",
      tooltip: `현재 Manager v${appVersion}`,
      interactive: true,
      busy: false,
      emphasize: false,
      action: "check",
    };
  }

  if (nativeStatus === "idle") {
    return {
      label: "업데이트 확인",
      tooltip: `현재 Manager v${appVersion}`,
      interactive: true,
      busy: false,
      emphasize: false,
      action: "check",
    };
  }

  return {
    label: "업데이트 확인",
    tooltip: `현재 Manager v${appVersion}`,
    interactive: true,
    busy: false,
    emphasize: false,
    action: "check",
  };
}
