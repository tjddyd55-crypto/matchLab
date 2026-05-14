import { AdminOrganizersTable } from "@/components/domain/admin/AdminOrganizersTable";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";

export const dynamic = "force-dynamic";

export default async function AdminOrganizersPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminOrganizers(actor);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">전체 주최자</h1>
        <p className="text-muted-foreground mt-1 text-sm">조회 전용. 계정 연동 정보는 표시하지 않습니다.</p>
      </div>
      <AdminOrganizersTable rows={rows} />
    </div>
  );
}
