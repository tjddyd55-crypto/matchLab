import { AdminOrganizersTable } from "@/components/domain/admin/AdminOrganizersTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminContentCardClass, adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminOrganizersPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminOrganizers(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 주최자"
          description="모든 Organizer 계정입니다. 협회만 보려면 「사용자 관리 → 협회」를 사용하세요. 로그인 아이디는 최고 관리자만 볼 수 있습니다."
        />
        <div className={adminContentCardClass}>
          <AdminOrganizersTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
