import { notFound } from "next/navigation";
import { AdminAssociationDetailView } from "@/components/domain/admin/AdminAssociationDetailView";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { adminService } from "@/lib/services/admin.service";
import {
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminAssociationDetailPage({
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

  let detail;
  try {
    detail = await adminService.getAdminAssociationDetail(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminAssociationDetailView detail={detail} tabParam={tab} />
      </div>
    </div>
  );
}
