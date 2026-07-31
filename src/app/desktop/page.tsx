import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/actor";
import {
  DESKTOP_LAUNCH_PATH,
  DESKTOP_LOGIN_PATH,
  DESKTOP_UNAVAILABLE_PATH,
} from "@/lib/desktop/constants";
import { isDesktopManagerRole } from "@/lib/desktop/manager-roles";
import { DesktopPreparing } from "@/components/domain/desktop/DesktopPreparing";

/**
 * Electron 첫 진입. 세션 있으면 launch, 없으면 login.
 * Electron 판별에 의존해 보안을 약화하지 않음 — 웹에서도 동일하게 안전.
 */
export default async function DesktopEntryPage() {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect(DESKTOP_LOGIN_PATH);
  }
  if (!isDesktopManagerRole(actor.role)) {
    redirect(DESKTOP_UNAVAILABLE_PATH);
  }
  redirect(DESKTOP_LAUNCH_PATH);

  return <DesktopPreparing />;
}
