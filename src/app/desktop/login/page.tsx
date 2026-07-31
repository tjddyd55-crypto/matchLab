import { redirect } from "next/navigation";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { DesktopLoginForm } from "@/components/domain/desktop/DesktopLoginForm";
import { getCurrentActor } from "@/lib/auth/actor";
import {
  DESKTOP_LAUNCH_PATH,
  DESKTOP_UNAVAILABLE_PATH,
} from "@/lib/desktop/constants";
import { isDesktopManagerRole } from "@/lib/desktop/manager-roles";

export default async function DesktopLoginPage() {
  const actor = await getCurrentActor();
  if (actor) {
    if (isDesktopManagerRole(actor.role)) {
      redirect(DESKTOP_LAUNCH_PATH);
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
