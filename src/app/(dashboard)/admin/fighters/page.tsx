import { AdminFightersTable } from "@/components/domain/admin/AdminFightersTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminFightersPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminFighters(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 선수"
          description="연락처·생년월일·보호자 정보는 표시하지 않습니다."
        />
        <Card>
          <CardContent className="pt-4">
            <AdminFightersTable rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
