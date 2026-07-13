"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getEventManagementNavItems,
  groupEventManagementNavItems,
  isEventManagementNavItemActive,
} from "@/lib/event-management-nav-items";
import {
  eventManagementSidebarClass,
  eventManagementSidebarLinkActiveClass,
  eventManagementSidebarLinkBaseClass,
  eventManagementSidebarLinkInactiveClass,
  eventManagementSidebarSectionLabelClass,
} from "@/lib/ui/event-management-ui";
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
      className={cn(
        eventManagementSidebarClass,
        "sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto",
      )}
      aria-label="대회 관리 메뉴"
    >
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.group}>
            <p className={eventManagementSidebarSectionLabelClass}>
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
                        eventManagementSidebarLinkBaseClass,
                        active
                          ? eventManagementSidebarLinkActiveClass
                          : eventManagementSidebarLinkInactiveClass,
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
