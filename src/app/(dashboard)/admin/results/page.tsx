import { AdminResultsTable } from "@/components/domain/admin/AdminResultsTable";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminMatchResults(actor);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">전체 경기 결과</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          MatchResult 행 기준(선수별 1행). 스냅샷 상세·정정 사유는 표시하지 않습니다.
        </p>
      </div>
      <AdminResultsTable rows={rows} />
    </div>
  );
}
