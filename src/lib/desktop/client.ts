/**
 * 클라이언트에서 MATCHON Manager preload bridge 감지 (UI 분기용).
 * 서버 권한 인증 수단이 아님.
 */
export function isMatchonDesktopClient(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = (
    window as Window & {
      matchonDesktop?: { isDesktopApp?: () => boolean };
    }
  ).matchonDesktop;
  return Boolean(bridge?.isDesktopApp?.());
}
