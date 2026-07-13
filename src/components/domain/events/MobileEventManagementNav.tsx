"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  getEventManagementNavItems,
  isEventManagementNavItemActive,
} from "@/lib/event-management-nav-items";
import { Button } from "@/components/ui/button";
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

export function MobileEventManagementNav({
  eventId,
  publicSlug,
}: {
  eventId: string;
  publicSlug?: string | null;
}) {
  const pathname = usePathname() ?? "";
  const [hash, setHash] = useState("");
  const [open, setOpen] = useState(false);
  const items = getEventManagementNavItems(eventId, publicSlug);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const activeItem =
    items.find((item) =>
      isEventManagementNavItemActive(pathname, hash, eventId, item),
    ) ?? items[0];

  return (
    <div className="space-y-2 border-b border-matchon-border pb-4 lg:hidden">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full justify-between rounded-lg border-matchon-border bg-white"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="event-management-mobile-nav"
      >
        <span className="text-sm">
          대회 메뉴
          {activeItem ? (
            <span className="text-matchon-text-secondary ml-2 font-normal">
              · {activeItem.label}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Button>

      {open ? (
        <nav
          id="event-management-mobile-nav"
          className={cn(matchonScrollablePillsClass, "-mx-1 px-1")}
          aria-label="대회 관리 바로가기"
        >
          {items.map((item) => {
            const active = isEventManagementNavItemActive(
              pathname,
              hash,
              eventId,
              item,
            );
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  matchonScrollablePillItemClass,
                  matchonFilterPillBaseClass,
                  active
                    ? matchonFilterPillActiveClass
                    : matchonFilterPillInactiveClass,
                )}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
