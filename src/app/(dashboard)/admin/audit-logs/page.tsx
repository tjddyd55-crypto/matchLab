import { AdminAuditLogsTable } from "@/components/domain/admin/AdminAuditLogsTable";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminAuditLogs(actor);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">감사 로그</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          before/after JSON·민감 필드는 MVP에서 표시하지 않습니다. 최근 {rows.length}건까지
          로드합니다.
        </p>
      </div>
      <AdminAuditLogsTable rows={rows} />
    </div>
  );
}
