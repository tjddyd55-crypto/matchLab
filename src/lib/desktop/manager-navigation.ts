import { DESKTOP_LOGIN_PATH } from "@/lib/desktop/constants";

/** Electron global back — role home fallback when history is empty (client-safe) */
export function managerRoleHomeFromPathname(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "";

  if (path.startsWith("/organizer")) return "/organizer";
  if (path.startsWith("/gym")) return "/gym";
  if (path.startsWith("/admin")) return "/admin";
  if (path.startsWith("/fighter")) return "/fighter";
  if (path.startsWith("/desktop")) return DESKTOP_LOGIN_PATH;

  return DESKTOP_LOGIN_PATH;
}

export function managerRoleHomeForActorRole(role: string): string {
  switch (role) {
    case "organizer":
      return "/organizer";
    case "gym":
    case "gym_staff":
      return "/gym";
    case "admin":
      return "/admin";
    case "fighter":
      return "/fighter";
    default:
      return DESKTOP_LOGIN_PATH;
  }
}
