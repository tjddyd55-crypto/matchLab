import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { DesktopUnavailableActions } from "@/components/domain/desktop/DesktopUnavailableActions";
import { DESKTOP_MANAGER_UNAVAILABLE_MESSAGE } from "@/lib/desktop/constants";

export default function DesktopUnavailablePage() {
  return (
    <AuthLoginShell
      logoHref={null}
      eyebrow="MATCHON Manager"
      title="사용 권한이 없습니다"
      description={DESKTOP_MANAGER_UNAVAILABLE_MESSAGE}
    >
      <DesktopUnavailableActions />
    </AuthLoginShell>
  );
}
