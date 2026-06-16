import type { DashboardRole } from "@/components/layout/DashboardShell";

/** 로그인 actor.role → 대시보드 shell 역할 */
export function dashboardRoleFor(actorRole: string): DashboardRole {
  switch (actorRole) {
    case "admin":
      return "admin";
    case "organizer":
      return "organizer";
    case "gym":
      return "gym";
    case "fighter":
      return "fighter";
    default:
      return "fighter";
  }
}

/** 역할별 대시보드 홈 경로 */
export function getDashboardHomeHref(actorRole: string): string {
  switch (dashboardRoleFor(actorRole)) {
    case "admin":
      return "/admin";
    case "organizer":
      return "/organizer";
    case "gym":
      return "/gym";
    case "fighter":
      return "/fighter";
    default:
      return "/";
  }
}
