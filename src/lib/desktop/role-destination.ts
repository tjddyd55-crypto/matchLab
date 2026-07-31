import type { ActorContext } from "@/lib/auth/actor-context";
import { dashboardPathForRole } from "@/lib/auth/actor";
import {
  DESKTOP_UNAVAILABLE_PATH,
  DESKTOP_MANAGER_UNAVAILABLE_MESSAGE,
} from "@/lib/desktop/constants";
import { isDesktopManagerRole } from "@/lib/desktop/manager-roles";

export type DesktopDestination =
  | { kind: "redirect"; path: string }
  | { kind: "unavailable"; path: string; message: string };

/**
 * 로그인된 Actor의 MATCHON Manager 시작 route.
 * User.role은 단일값이므로 역할 선택 UI는 현재 불필요 — 기존 dashboardPathForRole 재사용.
 */
export function resolveDesktopDestination(actor: ActorContext): DesktopDestination {
  if (!isDesktopManagerRole(actor.role)) {
    return {
      kind: "unavailable",
      path: DESKTOP_UNAVAILABLE_PATH,
      message: DESKTOP_MANAGER_UNAVAILABLE_MESSAGE,
    };
  }

  if (actor.role === "gym_staff" && actor.mustChangePassword) {
    return {
      kind: "redirect",
      path: "/gym/change-password",
    };
  }

  return {
    kind: "redirect",
    path: dashboardPathForRole(actor.role),
  };
}
