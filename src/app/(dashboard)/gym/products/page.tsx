import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireGymPortalSalesManage } from "@/lib/gym-portal-access";
import { gymProductService } from "@/lib/services/gym-product.service";
import { GymProductsManager } from "@/components/domain/gym-sales/GymProductsManager";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MemberPageHeader } from "@/components/domain/gym-members/MemberPageHeader";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";

export const dynamic = "force-dynamic";

export default async function GymProductsPage() {
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

  const products = await gymProductService.listProducts(actor);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <MemberPageHeader
          title="상품 관리"
          description="자주 판매하는 용품을 등록해 매출 입력 시 빠르게 선택할 수 있습니다."
        />
        <GymProductsManager
          initialProducts={products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            defaultPrice: p.defaultPrice,
            isActive: p.isActive,
            sortOrder: p.sortOrder,
            memo: p.memo,
          }))}
        />
      </div>
    </div>
  );
}
