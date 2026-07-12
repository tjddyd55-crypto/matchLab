"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { MatchonTabs } from "@/components/shared/MatchonTabs";
import {
  BRACKET_PAGE_TAB_LABELS,
  BRACKET_PAGE_TABS,
  type BracketPageTab,
} from "@/lib/brackets/bracket-page-tab";

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
      <MatchonTabs items={TABS} activeId={activeTab} onChange={selectTab} />

      <div role="tabpanel" data-event-id={eventId}>
        {panel}
      </div>
    </div>
  );
}
