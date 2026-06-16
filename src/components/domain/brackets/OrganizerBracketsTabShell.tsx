"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  BRACKET_PAGE_TAB_LABELS,
  BRACKET_PAGE_TABS,
  type BracketPageTab,
} from "@/lib/brackets/bracket-page-tab";
import { cn } from "@/lib/utils";

const TABS = BRACKET_PAGE_TABS.map((id) => ({
  id,
  label: BRACKET_PAGE_TAB_LABELS[id],
}));

export function OrganizerBracketsTabShell({
  eventId,
  activeTab,
  settings,
  generate,
  view,
}: {
  eventId: string;
  activeTab: BracketPageTab;
  settings: ReactNode;
  generate: ReactNode;
  view: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function selectTab(tab: BracketPageTab) {
    const params = new URLSearchParams();
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const panel =
    activeTab === "settings"
      ? settings
      : activeTab === "generate"
        ? generate
        : view;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
        role="tablist"
        aria-label="대진표 관리 탭"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" data-event-id={eventId}>
        {panel}
      </div>
    </div>
  );
}
