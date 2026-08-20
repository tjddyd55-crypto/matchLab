"use client";

import { useState } from "react";
import { OrganizerGlobalNavGroups } from "@/components/layout/OrganizerGlobalNavGroups";
import type { OrganizerGlobalNavGroup } from "@/lib/navigation/organizer-global-navigation";

export function OrganizerMobileNavSheet({
  groups,
}: {
  groups: OrganizerGlobalNavGroup[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="rounded-md border border-matchon-border px-3 py-1.5 text-xs font-semibold text-matchon-text-primary"
        onClick={() => setOpen(true)}
      >
        메뉴
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-matchon-sidebar p-4 text-white shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">주최자 메뉴</p>
              <button
                type="button"
                className="text-xs text-white/70"
                onClick={() => setOpen(false)}
              >
                닫기
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <OrganizerGlobalNavGroups
                groups={groups}
                density="touch"
                onNavigate={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
