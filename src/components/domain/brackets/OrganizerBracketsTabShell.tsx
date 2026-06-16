"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BracketPageTab = "settings" | "generate" | "view";

const TABS: { id: BracketPageTab; label: string }[] = [
  { id: "settings", label: "기본설정" },
  { id: "generate", label: "대진표 생성" },
  { id: "view", label: "대진표 보기" },
];

export function parseBracketPageTab(
  value: string | string[] | undefined,
): BracketPageTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "settings" || raw === "generate" || raw === "view") {
    return raw;
  }
  return "view";
}

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
