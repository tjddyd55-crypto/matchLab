"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getEventManagementNavItems,
  groupEventManagementNavItems,
  isEventManagementNavItemActive,
} from "@/lib/event-management-nav-items";
import { cn } from "@/lib/utils";

export function EventManagementSideNav({
  eventId,
  publicSlug,
}: {
  eventId: string;
  publicSlug?: string | null;
}) {
  const pathname = usePathname() ?? "";
  const [hash, setHash] = useState("");
  const items = getEventManagementNavItems(eventId, publicSlug);
  const sections = groupEventManagementNavItems(items);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return (
    <nav
      className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1"
      aria-label="대회 관리 메뉴"
    >
      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.group}>
            <p className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wide uppercase">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isEventManagementNavItemActive(
                  pathname,
                  hash,
                  eventId,
                  item,
                );
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-foreground hover:bg-muted",
                      )}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
