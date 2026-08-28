import { AdminFightersTable } from "@/components/domain/admin/AdminFightersTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminContentCardClass, adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminFightersPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminFighters(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 선수"
          description="연락처·생년월일·보호자 정보는 표시하지 않습니다. Career는 Archive 확정 결과 기준입니다."
        />
        <div className={adminContentCardClass}>
          <AdminFightersTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
