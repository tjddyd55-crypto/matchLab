import {
  DESKTOP_LOGIN_PATH,
  DESKTOP_REQUEST_HEADER,
  DESKTOP_USER_AGENT_TOKEN,
} from "@/lib/desktop/constants";

/**
 * MATCHON Manager — 인증 전 허용 path (prefix).
 * 웹 public homepage(`/`)는 포함하지 않는다.
 */
export const DESKTOP_UNAUTH_ALLOWED_PATH_PREFIXES = [
  "/desktop",
  "/login",
  "/password-reset",
  "/join",
  "/api/",
] as const;

export function isMatchonDesktopRequestHeaders(input: {
  headerValue: string | null;
  userAgent: string | null;
}): boolean {
  if (input.headerValue === "1") return true;
  const ua = input.userAgent ?? "";
  return ua.includes(DESKTOP_USER_AGENT_TOKEN);
}

export function isDesktopUnauthAllowedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return DESKTOP_UNAUTH_ALLOWED_PATH_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) {
      return path === prefix.slice(0, -1) || path.startsWith(prefix);
    }
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

/**
 * Desktop + unauthenticated 이면 login boundary로 보낼지.
 * 허용 path면 null, 아니면 DESKTOP_LOGIN_PATH.
 */
export function resolveDesktopUnauthRedirectPath(
  pathname: string,
): string | null {
  if (isDesktopUnauthAllowedPath(pathname)) return null;
  return DESKTOP_LOGIN_PATH;
}

export { DESKTOP_LOGIN_PATH, DESKTOP_REQUEST_HEADER };
