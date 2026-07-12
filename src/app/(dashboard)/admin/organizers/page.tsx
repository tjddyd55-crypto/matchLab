import { AdminOrganizersTable } from "@/components/domain/admin/AdminOrganizersTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminOrganizersPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminOrganizers(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 주최자"
          description="조회 전용. 계정 연동 정보는 표시하지 않습니다."
        />
        <Card>
          <CardContent className="pt-4">
            <AdminOrganizersTable rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
