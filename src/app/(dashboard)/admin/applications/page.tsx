import { AdminApplicationsTable } from "@/components/domain/admin/AdminApplicationsTable";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminApplications(actor);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">전체 신청</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          스냅샷 JSON·메모 원문은 표시하지 않습니다. 주최자 신청 관리 화면으로 이동할 수 있습니다.
        </p>
      </div>
      <AdminApplicationsTable rows={rows} />
    </div>
  );
}
