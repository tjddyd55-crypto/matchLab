import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { PublicEventDetailHero } from "@/components/domain/events/PublicEventDetailHero";
import { PublicEventOverviewSection } from "@/components/domain/events/public/PublicEventOverviewSection";
import { PUBLIC_EVENT_DETAIL_PAGE_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

/**
 * 공개 공고 본문 SSOT — public standalone·Manager embedded preview 공유.
 * shell(공개 헤더·탭)은 포함하지 않는다.
 */
export function PublicEventAnnouncementContent({
  event,
  variant = "embedded",
}: {
  event: PublicEventDetailDTO;
  /** Manager content area — viewport 전체 width·public padding 미사용 */
  variant?: "embedded" | "standalone";
}) {
  return (
    <article
      className={cn(
        variant === "standalone"
          ? PUBLIC_EVENT_DETAIL_PAGE_CLASS
          : "flex w-full min-w-0 flex-col gap-8 md:gap-10",
      )}
    >
      <PublicEventDetailHero event={event} />
      <PublicEventOverviewSection event={event} />
    </article>
  );
}
