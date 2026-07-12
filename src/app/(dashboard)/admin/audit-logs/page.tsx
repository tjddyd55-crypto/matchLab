import { AdminAuditLogsTable } from "@/components/domain/admin/AdminAuditLogsTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminAuditLogs(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="감사 로그"
          description={`before/after JSON·민감 필드는 MVP에서 표시하지 않습니다. 최근 ${rows.length}건까지 로드합니다.`}
        />
        <Card>
          <CardContent className="pt-4">
            <AdminAuditLogsTable rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
