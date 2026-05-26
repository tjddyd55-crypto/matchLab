import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { fieldStatusService } from "@/lib/services/field-status.service";
import { GymFieldStatusTable } from "@/components/domain/field-status/GymFieldStatusTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymEventFieldStatusPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  if (!actor.gymId) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="체육관 계정이 필요합니다"
          description="현장 상태는 체육관(관장) 계정에서 조회할 수 있습니다."
        />
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof fieldStatusService.listGymEventFieldStatus>>;
  try {
    data = await fieldStatusService.listGymEventFieldStatus(actor, eventId);
  } catch (e) {
    const message =
      e instanceof AppError ? e.message : "상태를 불러오지 못했습니다.";
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState title="조회할 수 없습니다" description={message} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/gym/events"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 대회 목록
          </Link>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            현장 확인·계체 상태
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{data.eventTitle}</p>
        </div>
      </div>

      <p className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm">
        현장 확인·계체 상태는 주최측 현장 운영자가 기록합니다. 수정이 필요하면
        주최자에게 문의해 주세요.
      </p>

      <GymFieldStatusTable rows={data.rows} />
    </div>
  );
}
