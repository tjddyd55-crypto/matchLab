import "server-only";

import { cookies } from "next/headers";

export const GYM_MEMBER_PORTAL_SESSION_COOKIE =
  "matchon_gym_member_portal_session";

/** 세션 TTL — 12시간 (최대 24시간 미만) */
export const GYM_MEMBER_PORTAL_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const GYM_MEMBER_PORTAL_SESSION_MAX_AGE_SEC = 12 * 60 * 60;

export async function setGymMemberPortalSessionCookie(
  rawSessionToken: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GYM_MEMBER_PORTAL_SESSION_COOKIE, rawSessionToken.trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GYM_MEMBER_PORTAL_SESSION_MAX_AGE_SEC,
  });
}

export async function readGymMemberPortalSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(GYM_MEMBER_PORTAL_SESSION_COOKIE)?.value;
  if (!value?.trim()) return null;
  return value.trim();
}

export async function clearGymMemberPortalSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  // 생성 시와 동일한 path/secure/sameSite로 만료해야 브라우저가 삭제한다.
  cookieStore.set(GYM_MEMBER_PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  try {
    cookieStore.delete({
      name: GYM_MEMBER_PORTAL_SESSION_COOKIE,
      path: "/",
    });
  } catch {
    cookieStore.delete(GYM_MEMBER_PORTAL_SESSION_COOKIE);
  }
}
