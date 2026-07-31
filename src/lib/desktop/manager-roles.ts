import type { UserRole } from "@/lib/enums";

/** MATCHON Manager에서 허용하는 관리자 역할 (SSOT). */
export const DESKTOP_MANAGER_ROLES = [
  "admin",
  "organizer",
  "gym",
  "gym_staff",
] as const satisfies readonly UserRole[];

export type DesktopManagerRole = (typeof DESKTOP_MANAGER_ROLES)[number];

export function isDesktopManagerRole(role: UserRole): role is DesktopManagerRole {
  return (DESKTOP_MANAGER_ROLES as readonly UserRole[]).includes(role);
}
