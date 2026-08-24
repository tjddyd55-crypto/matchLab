import { redirect } from "next/navigation";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { DesktopAppVersionLabel } from "@/components/domain/desktop/DesktopAppVersionLabel";
import { DesktopAuthBoundaryEffect } from "@/components/domain/desktop/DesktopAuthBoundaryEffect";
import { DesktopLoginForm } from "@/components/domain/desktop/DesktopLoginForm";
import { DesktopUpdateStatusButton } from "@/components/domain/desktop/DesktopUpdateStatusButton";
import { getCurrentActor } from "@/lib/auth/actor";
import { DESKTOP_UNAVAILABLE_PATH } from "@/lib/desktop/constants";
import { isDesktopManagerRole } from "@/lib/desktop/manager-roles";
import { resolveDesktopDestination } from "@/lib/desktop/role-destination";

export default async function DesktopLoginPage() {
  const actor = await getCurrentActor();
  if (actor) {
    if (isDesktopManagerRole(actor.role)) {
      const destination = resolveDesktopDestination(actor);
      redirect(destination.path);
    }
    redirect(DESKTOP_UNAVAILABLE_PATH);
  }

  return (
    <div className="relative min-h-screen w-full">
      <DesktopAuthBoundaryEffect />
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-5">
        <DesktopUpdateStatusButton />
      </div>
      <AuthLoginShell
        logoHref={null}
        title="MATCHON Manager"
        description="주최측과 체육관 운영을 위한 관리자 프로그램"
        footer={<DesktopAppVersionLabel className="mt-5 text-[0.7rem] opacity-80" />}
      >
        <DesktopLoginForm />
      </AuthLoginShell>
    </div>
  );
}
