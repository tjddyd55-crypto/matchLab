import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { PUBLIC_EVENT_DETAIL_PAGE_CLASS } from "@/components/domain/events/public/public-event-layout";
import { PublicEventDetailHero } from "@/components/domain/events/PublicEventDetailHero";
import { PublicEventDetailTabs } from "@/components/domain/events/public/PublicEventDetailTabs";
import type { PublicEventTabId } from "@/lib/public-event-tabs";

export function PublicEventDetailShell({
  event,
  slug,
  activeTab,
  children,
}: {
  event: PublicEventDetailDTO;
  slug: string;
  activeTab: PublicEventTabId;
  children: React.ReactNode;
}) {
  return (
    <article className={PUBLIC_EVENT_DETAIL_PAGE_CLASS}>
      <PublicEventDetailHero event={event} />
      <PublicEventDetailTabs
        slug={slug}
        activeTab={activeTab}
        showLive={event.liveStreamingEnabled}
      />
      <div id="event-tab-panel">{children}</div>
    </article>
  );
}
