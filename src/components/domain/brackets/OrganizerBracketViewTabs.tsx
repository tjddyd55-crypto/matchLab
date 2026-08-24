"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  BRACKET_VIEW_SUB_TAB_LABELS,
  BRACKET_VIEW_SUB_TABS,
  type BracketViewSubTab,
} from "@/lib/brackets/bracket-page-tab";
import {
  matchonUnderlineTabActiveClass,
  matchonUnderlineTabBaseClass,
  matchonUnderlineTabInactiveClass,
  matchonUnderlineTabsNavClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export function OrganizerBracketViewTabs({
  activeSubTab,
  board,
  workspace,
}: {
  activeSubTab: BracketViewSubTab;
  board: ReactNode;
  workspace: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function selectSubTab(sub: BracketViewSubTab) {
    const params = new URLSearchParams();
    params.set("tab", "view");
    if (sub === "workspace") {
      params.set("view", "workspace");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <nav
        className={matchonUnderlineTabsNavClass}
        aria-label="대진표 보기 하위 탭"
      >
        {BRACKET_VIEW_SUB_TABS.map((id) => {
          const active = activeSubTab === id;
          return (
            <button
              key={id}
              type="button"
              className={cn(
                matchonUnderlineTabBaseClass,
                active
                  ? matchonUnderlineTabActiveClass
                  : matchonUnderlineTabInactiveClass,
              )}
              aria-current={active ? "page" : undefined}
              onClick={() => selectSubTab(id)}
            >
              {BRACKET_VIEW_SUB_TAB_LABELS[id]}
            </button>
          );
        })}
      </nav>
      {activeSubTab === "workspace" ? workspace : board}
    </div>
  );
}
