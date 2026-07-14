"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { OrganizerGlobalNavGroup } from "@/lib/navigation/organizer-global-navigation";
import { cn } from "@/lib/utils";

export function OrganizerMobileNavSheet({
  groups,
}: {
  groups: OrganizerGlobalNavGroup[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
            <nav className="flex-1 space-y-4 overflow-y-auto">
              {groups.map((group) => (
                <div key={group.id} className="space-y-1">
                  {group.label ? (
                    <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">
                      {group.label}
                    </p>
                  ) : null}
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "block rounded-md px-2 py-2 text-sm",
                              active
                                ? "bg-white/12 font-semibold"
                                : "text-white/75",
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
