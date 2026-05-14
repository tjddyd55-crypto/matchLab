import { AdminGymsTable } from "@/components/domain/admin/AdminGymsTable";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";

export const dynamic = "force-dynamic";

export default async function AdminGymsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminGyms(actor);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">전체 체육관</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          전화번호·주소는 MVP 관리자 목록에서 제외합니다.
        </p>
      </div>
      <AdminGymsTable rows={rows} />
    </div>
  );
}
