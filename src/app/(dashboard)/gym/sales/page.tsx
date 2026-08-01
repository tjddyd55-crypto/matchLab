import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireGymPortalSalesManage } from "@/lib/gym-portal-access";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { GymSalesDashboardPanel } from "@/components/domain/gym-sales/GymSalesDashboardPanel";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";
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

  const [data, membersResult] = await Promise.all([
    gymSalesService.getDashboard(actor, filters),
    gymMemberService.listMembers(actor, { page: 1, pageSize: 300 }),
  ]);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <h1 className={matchonPageTitleClass}>매출 관리</h1>
          <p className={matchonPageDescClass}>
            회원 결제 내역을 기준으로 체육관 매출과 미수금을 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gym/sales/receivables"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            미수금
          </Link>
        </div>
        <GymSalesDashboardPanel
          data={data}
          members={membersResult.items.map((m) => ({
            id: m.id,
            name: m.name,
          }))}
          filters={filters}
        />
      </div>
    </div>
  );
}
