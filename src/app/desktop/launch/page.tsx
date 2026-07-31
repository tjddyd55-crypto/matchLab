import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/actor";
import { DESKTOP_LOGIN_PATH } from "@/lib/desktop/constants";
import { resolveDesktopDestination } from "@/lib/desktop/role-destination";
import { DesktopPreparing } from "@/components/domain/desktop/DesktopPreparing";

/**
 * 역할별 관리자 시작 route로 이동. redirect loop 방지용 중간 단계.
 */
export default async function DesktopLaunchPage() {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect(DESKTOP_LOGIN_PATH);
  }

  const destination = resolveDesktopDestination(actor);
  redirect(destination.path);

  return <DesktopPreparing message="관리 화면으로 이동하고 있습니다." />;
}
