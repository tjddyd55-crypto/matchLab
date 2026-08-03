import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminPasswordResetLinkPanel } from "@/components/domain/admin/AdminPasswordResetLinkPanel";
import { requireActor } from "@/lib/auth/actor";
import { requireRole } from "@/lib/permissions";
import { UserRole } from "@/lib/enums";
import { loadMatchonAdminPasswordResetLinkConfig } from "@/server/admin-password-reset/config";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminPasswordResetLinksPage() {
  const actor = await requireActor();
  requireRole(actor, [UserRole.admin]);
  const config = loadMatchonAdminPasswordResetLinkConfig();

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="비밀번호 재설정 링크"
          description="협회·체육관 대표 계정에 일회용 재설정 링크를 발급합니다. 기존 비밀번호는 확인할 수 없습니다."
        />
        <div className={adminContentCardClass}>
          {config.enabled ? (
            <AdminPasswordResetLinkPanel />
          ) : (
            <p className="text-sm text-matchon-text-secondary">
              관리자 비밀번호 재설정 링크 기능이 비활성입니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
