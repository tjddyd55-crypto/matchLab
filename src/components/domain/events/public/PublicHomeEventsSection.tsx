import Link from "next/link";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import { PublicEventListDesktop } from "@/components/domain/events/public/PublicEventListDesktop";
import { PublicEventListMobile } from "@/components/domain/events/public/PublicEventListMobile";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicHomeEventsSection({
  events,
}: {
  events: PublicEventListItemDTO[];
}) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 md:gap-6 md:px-6 md:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold md:text-xl">대회 공고</h2>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">
            최신 공개 대회를 포스터와 함께 확인하세요.
          </p>
        </div>
        <Link
          href="/events"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          전체 보기
        </Link>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="표시할 대회 공고가 없습니다"
          description="공개된 대회가 등록되면 여기에 포스터 카드가 표시됩니다."
        />
      ) : (
        <>
          <PublicEventListDesktop events={events} />
          <PublicEventListMobile events={events} />
        </>
      )}
    </section>
  );
}
