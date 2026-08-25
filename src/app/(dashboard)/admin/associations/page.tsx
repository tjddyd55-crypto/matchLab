import { AdminAssociationsTable } from "@/components/domain/admin/AdminAssociationsTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminAssociationsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminAssociations(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="협회"
          description="승인된 협회(Organizer type=association)를 관리합니다. 가입 심사는 「협회 가입 신청」 메뉴를 사용하세요."
        />
        <div className={adminContentCardClass}>
          <AdminAssociationsTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
