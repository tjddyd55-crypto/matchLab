import { AdminEventsTable } from "@/components/domain/admin/AdminEventsTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminContentCardClass, adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminEvents(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 대회"
          description="운영 화면은 주최자 뷰로 열립니다. 필터·검색·페이지네이션은 TODO."
        />
        <div className={adminContentCardClass}>
          <AdminEventsTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
