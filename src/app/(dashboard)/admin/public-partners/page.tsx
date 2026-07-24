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
          title="메인 파트너 로고"
          description="메인 페이지 하단에 표시할 후원사·협력사·기관 로고를 관리합니다. 협회·주최자 프로필 로고와는 분리되어 있으며, 관리자가 직접 등록한 활성 로고만 공개 메인에 노출됩니다."
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
              description: r.description,
              sortOrder: r.sortOrder,
              isActive: r.isActive,
              openInNewTab: r.openInNewTab,
              startsAt: r.startsAt?.toISOString() ?? null,
              endsAt: r.endsAt?.toISOString() ?? null,
              exposureStatus: r.exposureStatus,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
