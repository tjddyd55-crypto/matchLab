import { AdminGymsTable } from "@/components/domain/admin/AdminGymsTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminContentCardClass, adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminGymsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminGyms(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 체육관"
          description="전화번호·주소는 MVP 관리자 목록에서 제외합니다."
        />
        <div className={adminContentCardClass}>
          <AdminGymsTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
