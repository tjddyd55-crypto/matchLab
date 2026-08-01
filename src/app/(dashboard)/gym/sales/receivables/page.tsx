import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireGymPortalSalesManage } from "@/lib/gym-portal-access";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { GymReceivablesPanel } from "@/components/domain/gym-sales/GymSalesDashboardPanel";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymSalesReceivablesPage() {
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

  const [rows, membersResult] = await Promise.all([
    gymSalesService.listReceivables(actor),
    gymMemberService.listMembers(actor, { page: 1, pageSize: 300 }),
  ]);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <h1 className={matchonPageTitleClass}>미수금</h1>
          <p className={matchonPageDescClass}>
            미수금은 매출 합계에 포함되지 않습니다. 실제 납부된 금액만 매출로
            반영됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gym/sales"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            매출 현황
          </Link>
        </div>
        <GymReceivablesPanel
          rows={rows}
          members={membersResult.items.map((m) => ({
            id: m.id,
            name: m.name,
          }))}
        />
      </div>
    </div>
  );
}
