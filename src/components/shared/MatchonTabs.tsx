"use client";

import { Button } from "@/components/ui/button";
import {
  matchonScrollablePillItemClass,
  matchonScrollablePillsClass,
} from "@/lib/ui/matchon-layout";
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
      {items.map((item) => (
        <Button
          key={item.id}
          type="button"
          size="sm"
          variant={activeId === item.id ? "default" : "outline"}
          disabled={item.disabled}
          role="tab"
          aria-selected={activeId === item.id}
          className={cn(
            matchonScrollablePillItemClass,
            "min-h-10 rounded-full px-4",
            activeId === item.id && "shadow-sm",
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
