"use client";

import {
  matchonScrollablePillItemClass,
  matchonScrollablePillsClass,
} from "@/lib/ui/matchon-layout";
import {
  matchonFilterPillActiveClass,
  matchonFilterPillBaseClass,
  matchonFilterPillInactiveClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type MatchonTabItem<T extends string> = {
  id: T;
  label: string;
  disabled?: boolean;
};

export function MatchonTabs<T extends string>({
  items,
  activeId,
  onChange,
  className,
  scrollable = true,
}: {
  items: MatchonTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  /** 모바일 가로 스크롤 — 기본 true */
  scrollable?: boolean;
}) {
  return (
    <div
      className={cn(
        scrollable
          ? cn(matchonScrollablePillsClass, "-mx-1 px-1")
          : "flex flex-wrap gap-2",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            role="tab"
            aria-selected={active}
            className={cn(
              matchonScrollablePillItemClass,
              matchonFilterPillBaseClass,
              active
                ? matchonFilterPillActiveClass
                : matchonFilterPillInactiveClass,
              item.disabled && "cursor-not-allowed opacity-50",
            )}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
