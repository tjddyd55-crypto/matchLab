import Link from "next/link";
import {
  PUBLIC_EVENT_TABS,
  publicEventTabHref,
  type PublicEventTabId,
} from "@/lib/public-event-tabs";
import { cn } from "@/lib/utils";

export function PublicEventDetailTabs({
  slug,
  activeTab,
  showLive,
}: {
  slug: string;
  activeTab: PublicEventTabId;
  showLive: boolean;
}) {
  const tabs = PUBLIC_EVENT_TABS.filter(
    (t) => t.id !== "live" || showLive,
  );

  return (
    <nav
      className="ring-foreground/10 -mx-1 rounded-xl bg-muted/30 p-1 ring-1"
      aria-label="대회 정보 탭"
    >
      <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={publicEventTabHref(slug, tab.id)}
              scroll={tab.id !== activeTab}
              className={cn(
                "shrink-0 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors",
                "min-w-[5.5rem] sm:min-w-0 md:flex-1",
                isActive
                  ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
