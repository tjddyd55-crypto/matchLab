import Link from "next/link";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import { EventListEmptyState } from "@/components/domain/events/EventListEmptyState";
import { PublicEventListDesktop } from "@/components/domain/events/public/PublicEventListDesktop";
import { PublicEventListMobile } from "@/components/domain/events/public/PublicEventListMobile";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

export function PublicHomeEventsSection({
  events,
}: {
  events: PublicEventListItemDTO[];
}) {
  return (
    <section
      className={cn(
        PUBLIC_CONTENT_CONTAINER_CLASS,
        "flex flex-col gap-5 py-8 md:gap-6 md:py-10",
      )}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
            Open for Registration
          </p>
          <h2 className="mt-1.5 font-black text-[28px] tracking-tight text-matchon-text-primary">
            진행 중인 대회 공고
          </h2>
        </div>
        <Link
          href="/events"
          className="text-sm font-bold text-matchon-primary hover:underline"
        >
          전체 보기 →
        </Link>
      </div>

      {events.length === 0 ? (
        <EventListEmptyState
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
