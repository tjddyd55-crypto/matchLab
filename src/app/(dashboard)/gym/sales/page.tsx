import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireGymPortalSalesManage } from "@/lib/gym-portal-access";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymProductService } from "@/lib/services/gym-product.service";
import { gymProductCategoryLabel } from "@/lib/gym-products/labels";
import { GymSalesDashboardPanel } from "@/components/domain/gym-sales/GymSalesDashboardPanel";
import { GymSalesRegisterCta } from "@/components/domain/gym-sales/GymSalesRegisterCta";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MemberPageHeader } from "@/components/domain/gym-members/MemberPageHeader";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";
import type { SalesPeriodKey } from "@/lib/gym-sales/calc";

export const dynamic = "force-dynamic";

export default async function GymSalesPage({
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
  const pick = (key: string) => {
    const v = sp[key];
    return typeof v === "string" ? v : undefined;
  };

  const period = (pick("period") ?? "this_month") as SalesPeriodKey;
  const filters = {
    period,
    from: pick("from"),
    to: pick("to"),
    memberNameQ: pick("memberNameQ"),
    phoneTail: pick("phoneTail"),
    paymentMethod: pick("paymentMethod"),
    status: pick("status"),
    category: pick("category"),
    sort: pick("sort") as "recent" | "amount_desc" | "amount_asc" | undefined,
  };

  const [data, membersResult, products] = await Promise.all([
    gymSalesService.getDashboard(actor, filters),
    gymMemberService.listMembers(actor, { page: 1, pageSize: 300 }),
    gymProductService.listProducts(actor, { activeOnly: true }),
  ]);

  const memberOptions = membersResult.items.map((m) => ({
    id: m.id,
    name: m.name,
  }));
  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    categoryLabel: gymProductCategoryLabel(p.category),
    defaultPrice: p.defaultPrice,
  }));

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <MemberPageHeader
          title="매출 현황"
          description="기간별 매출·수납·미수를 확인합니다. 등록은 매출 등록에서 진행하세요."
          actions={
            <GymSalesRegisterCta
              members={memberOptions}
              products={productOptions}
            />
          }
        />
        <GymSalesDashboardPanel data={data} filters={filters} />
      </div>
    </div>
  );
}
