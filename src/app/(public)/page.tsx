import Link from "next/link";
import { PublicEventCard } from "@/components/domain/events/PublicEventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { isPublicEventInProgress } from "@/lib/event-public";
import { eventService } from "@/lib/services/event.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  const events = await eventService.listPublicEvents();
  const inProgress = events.filter((e) => isPublicEventInProgress(e.status));
  const other = events.filter((e) => !isPublicEventInProgress(e.status));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 md:px-6">
      <section className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          대회 · 현장 정보
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          예정·진행 중인 공개 대회를 확인하고 대진표·라이브·결과로 이동할 수
          있습니다.
        </p>
        <Link href="/events" className={cn(buttonVariants({ variant: "outline" }))}>
          전체 대회 목록
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">진행 중 · 대진 준비</h2>
        {inProgress.length === 0 ? (
          <EmptyState
            title="진행 중인 대회가 없습니다"
            description="현재 공개된 진행 단계 대회가 없을 때 표시됩니다."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((e) => (
              <PublicEventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">예정 · 모집 · 종료</h2>
        {other.length === 0 ? (
          <EmptyState
            title="표시할 대회가 없습니다"
            description="공개 가능한 상태의 대회가 없습니다."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {other.map((e) => (
              <PublicEventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
