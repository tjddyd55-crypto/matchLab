/**
 * MATCHON Manager 업데이트 상태 → 사용자 표시 문구 SSOT.
 * Header / desktop login 이 동일 helper를 사용한다.
 * 내부 설정 키·오류 상세는 사용자 문구에 넣지 않는다.
 */
import type { MatchonDesktopUpdateStatus } from "@/types/matchon-desktop";

export type DesktopUpdateDisplay = {
  /** 버튼에 보이는 짧은 라벨 */
  label: string;
  /** title / tooltip (선택) */
  tooltip: string | null;
  /** 클릭 가능 여부 */
  interactive: boolean;
  /** busy(확인·다운로드 중) */
  busy: boolean;
  /** 강조(적용 가능) */
  emphasize: boolean;
};

export function getDesktopUpdateDisplayState(
  status: MatchonDesktopUpdateStatus,
): DesktopUpdateDisplay {
  const versionHint = status.availableVersion
    ? `v${status.currentVersion} → v${status.availableVersion}`
    : `현재 v${status.currentVersion}`;

  switch (status.state) {
    case "disabled":
      return {
        label: "최신 버전입니다",
        tooltip: "현재 설치된 버전이 최신입니다",
        interactive: true,
        busy: false,
        emphasize: false,
      };
    case "up_to_date":
      return {
        label: "최신 버전입니다",
        tooltip: versionHint,
        interactive: true,
        busy: false,
        emphasize: false,
      };
    case "idle":
      return {
        label: "업데이트 확인",
        tooltip: versionHint,
        interactive: true,
        busy: false,
        emphasize: false,
      };
    case "checking":
      return {
        label: "확인 중",
        tooltip: versionHint,
        interactive: false,
        busy: true,
        emphasize: false,
      };
    case "available":
      // autoDownload=true — 다운로드가 곧 시작되므로 준비 문구
      return {
        label: "업데이트 준비",
        tooltip: versionHint,
        interactive: false,
        busy: false,
        emphasize: false,
      };
    case "downloading": {
      const p =
        typeof status.progressPercent === "number"
          ? Math.max(0, Math.min(100, Math.round(status.progressPercent)))
          : null;
      return {
        label: p == null ? "다운로드 중" : `다운로드 중 ${p}%`,
        tooltip: versionHint,
        interactive: false,
        busy: true,
        emphasize: false,
      };
    }
    case "ready":
      return {
        label: "업데이트 적용",
        tooltip: versionHint,
        interactive: true,
        busy: false,
        emphasize: true,
      };
    case "error":
      return {
        label: "다시 확인",
        tooltip: "업데이트를 다시 확인해 주세요",
        interactive: true,
        busy: false,
        emphasize: false,
      };
    default:
      return {
        label: "업데이트 확인",
        tooltip: versionHint,
        interactive: true,
        busy: false,
        emphasize: false,
      };
  }
}
