"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ScheduleBoardMenuAction = {
  id: string;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

/**
 * 카드 더보기 / 우클릭 액션 메뉴.
 * 메뉴 자체는 외부 클릭으로 닫혀도 됨(모달과 분리).
 */
export function ScheduleBoardCardMenu({
  actions,
  open,
  onOpenChange,
  anchor,
}: {
  actions: ScheduleBoardMenuAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: { x: number; y: number } | null;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  if (!open || !anchor || actions.length === 0) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-labelledby={labelId}
      data-testid="schedule-card-menu"
      className="fixed z-[80] min-w-[11rem] overflow-hidden rounded-lg border border-matchon-border bg-white py-1 shadow-lg"
      style={{
        left: Math.min(anchor.x, window.innerWidth - 200),
        top: Math.min(anchor.y, window.innerHeight - actions.length * 36 - 16),
      }}
    >
      <span id={labelId} className="sr-only">
        일정 액션
      </span>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          disabled={action.disabled}
          className={cn(
            "flex w-full px-3 py-2 text-left text-sm hover:bg-matchon-surface/80 disabled:opacity-40",
            action.destructive
              ? "text-destructive"
              : "text-matchon-text-primary",
          )}
          onClick={() => {
            onOpenChange(false);
            action.onSelect();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
