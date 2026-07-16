import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminPublicPartnersManager } from "@/components/domain/admin/AdminPublicPartnersManager";
import { requireActor } from "@/lib/auth/actor";
import { adminPublicPartnerService } from "@/lib/services/admin-public-partner.service";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminPublicPartnersPage() {
  const actor = await requireActor();
  const rows = await adminPublicPartnerService.list(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="파트너 로고 관리"
          description="공개 홈「함께하는 협회 및 파트너」영역에 노출되는 스폰서·파트너 로고를 관리합니다. 협회 로고는 협회 프로필에서 관리합니다."
        />
        <div className={adminContentCardClass}>
          <AdminPublicPartnersManager
            initialRows={rows.map((r) => ({
              id: r.id,
              name: r.name,
              type: r.type,
              logoUrl: r.logoUrl,
              logoPath: r.logoPath,
              websiteUrl: r.websiteUrl,
              altText: r.altText,
              sortOrder: r.sortOrder,
              isActive: r.isActive,
              startsAt: r.startsAt?.toISOString() ?? null,
              endsAt: r.endsAt?.toISOString() ?? null,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
