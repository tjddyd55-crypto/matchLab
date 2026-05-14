import { AdminEventsTable } from "@/components/domain/admin/AdminEventsTable";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminEvents(actor);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">전체 대회</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          운영 화면은 주최자 뷰로 열립니다. 필터·검색·페이지네이션은 TODO.
        </p>
      </div>
      <AdminEventsTable rows={rows} />
    </div>
  );
}
