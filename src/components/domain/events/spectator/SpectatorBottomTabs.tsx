"use client";

import Link from "next/link";
import {
  SPECTATOR_WATCH_TABS,
  type SpectatorWatchTabId,
  spectatorWatchHref,
} from "@/lib/public-event-watch";
import { cn } from "@/lib/utils";

export function SpectatorBottomTabs({
  slug,
  activeTab,
  showLive,
}: {
  slug: string;
  activeTab: SpectatorWatchTabId;
  showLive: boolean;
}) {
  const tabs = SPECTATOR_WATCH_TABS.filter((t) => showLive || t.id !== "live");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      aria-label="관람 메뉴"
    >
      <div className="mx-auto flex w-full max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const href = spectatorWatchHref(slug, tab.id);
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "h-1 w-8 rounded-full",
                  isActive ? "bg-primary" : "bg-transparent",
                )}
                aria-hidden
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
