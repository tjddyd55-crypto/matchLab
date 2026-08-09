import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireGymPortalSalesManage } from "@/lib/gym-portal-access";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymProductService } from "@/lib/services/gym-product.service";
import { gymProductCategoryLabel } from "@/lib/gym-products/labels";
import { GymSalesEntryPanel } from "@/components/domain/gym-sales/GymSalesEntryPanel";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MemberPageHeader } from "@/components/domain/gym-members/MemberPageHeader";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";

export const dynamic = "force-dynamic";

export default async function GymSalesReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  try {
    await requireGymPortalSalesManage(actor);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    throw e;
  }

  const sp = await searchParams;
  const statusRaw = typeof sp.status === "string" ? sp.status : "all";
  const paymentStatus =
    statusRaw === "paid" ||
    statusRaw === "partial" ||
    statusRaw === "unpaid"
      ? statusRaw
      : "all";

  const [rows, membersResult, products] = await Promise.all([
    gymSalesService.listSalesEntries(actor, { paymentStatus }),
    gymMemberService.listMembers(actor, { page: 1, pageSize: 300 }),
    gymProductService.listProducts(actor, { activeOnly: true }),
  ]);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <MemberPageHeader
          title="매출 등록"
          description="등록한 매출과 미수 내역을 관리합니다. 미수는 아직 전액 받지 못한 매출 잔액입니다."
        />
        <GymSalesEntryPanel
          rows={rows}
          members={membersResult.items.map((m) => ({
            id: m.id,
            name: m.name,
          }))}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            categoryLabel: gymProductCategoryLabel(p.category),
            defaultPrice: p.defaultPrice,
          }))}
          initialFilter={paymentStatus}
        />
      </div>
    </div>
  );
}
