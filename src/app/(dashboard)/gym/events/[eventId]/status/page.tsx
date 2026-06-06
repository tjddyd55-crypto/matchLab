import Link from "next/link";
import { GymEventStatusBoard } from "@/components/domain/gym-event-status/GymEventStatusBoard";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { gymEventStatusService } from "@/lib/services/gym-event-status.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymEventStatusPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  if (!actor.gymId) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="체육관 계정이 필요합니다"
          description="신청 현황은 체육관(관장) 계정에서 조회할 수 있습니다."
        />
      </div>
    );
  }

  let data: Awaited<
    ReturnType<typeof gymEventStatusService.getGymEventStatusPage>
  >;
  try {
    data = await gymEventStatusService.getGymEventStatusPage(actor, eventId);
  } catch (e) {
    const message =
      e instanceof AppError ? e.message : "상태를 불러오지 못했습니다.";
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState title="조회할 수 없습니다" description={message} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
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
            신청 현황
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{data.eventTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/gym/events/${eventId}/field-status`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            현장/계체 상태
          </Link>
          <Link
            href={`/events/${data.publicSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            공개 공고
          </Link>
        </div>
      </div>

      <p className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm">
        신청·입금·현장 확인·대진 정보는 조회만 가능합니다. 수정이 필요하면
        주최자 또는 소속 체육관 운영자에게 문의해 주세요.
      </p>

      <GymEventStatusBoard data={data} />
    </div>
  );
}
