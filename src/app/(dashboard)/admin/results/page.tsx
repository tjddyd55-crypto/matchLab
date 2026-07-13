import { AdminResultsTable } from "@/components/domain/admin/AdminResultsTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminContentCardClass, adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminMatchResults(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 경기 결과"
          description="MatchResult 행 기준(선수별 1행). 스냅샷 상세·정정 사유는 표시하지 않습니다."
        />
        <div className={adminContentCardClass}>
          <AdminResultsTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
