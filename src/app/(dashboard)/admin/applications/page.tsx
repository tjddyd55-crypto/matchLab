import { AdminApplicationsTable } from "@/components/domain/admin/AdminApplicationsTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminApplications(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 신청"
          description="스냅샷 JSON·메모 원문은 표시하지 않습니다. 주최자 신청 관리 화면으로 이동할 수 있습니다."
        />
        <Card>
          <CardContent className="pt-4">
            <AdminApplicationsTable rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
