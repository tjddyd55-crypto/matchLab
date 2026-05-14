import { AdminFightersTable } from "@/components/domain/admin/AdminFightersTable";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";

export const dynamic = "force-dynamic";

export default async function AdminFightersPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminFighters(actor);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">전체 선수</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          연락처·생년월일·보호자 정보는 표시하지 않습니다.
        </p>
      </div>
      <AdminFightersTable rows={rows} />
    </div>
  );
}
