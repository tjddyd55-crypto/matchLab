import { redirect } from "next/navigation";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { DesktopLoginForm } from "@/components/domain/desktop/DesktopLoginForm";
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
    <AuthLoginShell
      logoHref={null}
      eyebrow="MATCHON Manager"
      title="관리자 로그인"
      description="주최측과 체육관 운영을 위한 관리자 프로그램"
    >
      <DesktopLoginForm />
    </AuthLoginShell>
  );
}
