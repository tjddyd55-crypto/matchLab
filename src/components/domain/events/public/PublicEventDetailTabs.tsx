import Link from "next/link";
import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import {
  PUBLIC_EVENT_TABS,
  publicEventTabHref,
  type PublicEventTabId,
} from "@/lib/public-event-tabs";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonScrollablePillItemClass,
  matchonScrollablePillsClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export function PublicEventDetailTabs({
  slug,
  activeTab,
  showLive,
  event,
}: {
  slug: string;
  activeTab: PublicEventTabId;
  showLive: boolean;
  event?: Pick<
    PublicEventDetailDTO,
    "status" | "hasPublicBrackets" | "hasPublicResults"
  >;
}) {
  const tabs = PUBLIC_EVENT_TABS.filter(
    (t) =>
      t.id !== "live" ||
      showLive ||
      activeTab === "live",
  );

  return (
    <div className="space-y-3">
      {event ? (
        <PublicEventTrustBadges event={event} className="px-0.5" compact />
      ) : null}
      <nav
        className={cn(
          matchonScrollablePillsClass,
          "-mx-1 px-1",
        )}
        aria-label="대회 정보 탭"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={publicEventTabHref(slug, tab.id)}
              scroll={tab.id !== activeTab}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                buttonVariants({
                  variant: isActive ? "default" : "outline",
                  size: "sm",
                }),
                matchonScrollablePillItemClass,
                "min-h-10 rounded-full px-4",
                isActive && "shadow-sm",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
