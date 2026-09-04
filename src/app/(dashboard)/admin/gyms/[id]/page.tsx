import { notFound } from "next/navigation";
import { AdminGymDetailView } from "@/components/domain/admin/AdminGymDetailView";
import { tryResolveAdminResetClientTarget } from "@/lib/admin/try-resolve-admin-reset-target";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { adminService } from "@/lib/services/admin.service";
import { tenantFeatureEntitlementService } from "@/lib/services/tenant-feature-entitlement.service";
import { loadMatchonAdminPasswordResetLinkConfig } from "@/server/admin-password-reset/config";
import {
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminGymDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  const { id } = await params;
  const { tab } = await searchParams;
  const adminResetEnabled = loadMatchonAdminPasswordResetLinkConfig().enabled;

  let detail;
  try {
    detail = await adminService.getAdminGymDetail(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  const resetTarget = adminResetEnabled
    ? await tryResolveAdminResetClientTarget(actor, detail.ownerUserId)
    : null;

  const tenantFeatures =
    tab === "platform-features"
      ? await tenantFeatureEntitlementService.listAdminTenantFeatures(
          actor,
          "gym",
          id,
        )
      : [];

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminGymDetailView
          detail={detail}
          tabParam={tab}
          tenantFeatures={tenantFeatures}
          passwordReset={
            adminResetEnabled
              ? {
                  enabled: true,
                  initialUserId: detail.ownerUserId,
                  initialLoginId: detail.loginId ?? "",
                  initialTarget: resetTarget,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
