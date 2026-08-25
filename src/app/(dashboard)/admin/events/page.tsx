import { AdminEventsTable } from "@/components/domain/admin/AdminEventsTable";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { shouldListEventOnPublicAnnouncementBoard } from "@/lib/events/public-event-visibility";
import { adminService } from "@/lib/services/admin.service";
import { adminContentCardClass, adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const actor = await requireActor();
  const rows = await adminService.listAdminEvents(actor);
  const publicListedCount = rows.filter((row) =>
    shouldListEventOnPublicAnnouncementBoard({
      status: row.status,
      publicSlug: row.publicSlug,
    }),
  ).length;

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="전체 대회"
          description={`운영 화면은 주최자 뷰로 열립니다. 공개 대회 공고(/events)와 동일 Event SSOT입니다. 공개 노출 ${publicListedCount}건 / 전체 ${rows.length}건.`}
        />
        <div className={adminContentCardClass}>
          <AdminEventsTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
