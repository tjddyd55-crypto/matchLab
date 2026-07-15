"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import {
  getAdminHomePaths,
  getAdminNavItems,
} from "@/lib/navigation/admin-navigation";

export function AdminMobileNavSheet() {
  const [open, setOpen] = useState(false);
  const items = getAdminNavItems();
  const homePaths = getAdminHomePaths();

  return (
    <>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-matchon-border text-matchon-text-primary md:hidden"
        aria-label="관리자 메뉴 열기"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="관리자 메뉴"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-matchon-sidebar p-4 text-white shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">관리자 메뉴</span>
              <button
                type="button"
                className="rounded-md p-2 text-white/80 hover:bg-white/10"
                aria-label="닫기"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div onClick={() => setOpen(false)}>
              <SidebarNav items={items} homePaths={homePaths} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
