"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getEventManagementGroupHref,
  getEventManagementNavItems,
  groupEventManagementNavItems,
  isEventManagementNavItemActive,
  resolveActiveEventManagementNavGroupId,
} from "@/lib/ui/event-management-navigation";
import {
  eventManagementBorderColorClass,
  eventManagementContentInsetClass,
  eventManagementPrimaryNavClass,
  eventManagementPrimaryNavLinkActiveClass,
  eventManagementPrimaryNavLinkBaseClass,
  eventManagementPrimaryNavLinkInactiveClass,
  eventManagementSecondaryNavClass,
  eventManagementSecondaryNavLinkActiveClass,
  eventManagementSecondaryNavLinkBaseClass,
  eventManagementSecondaryNavLinkInactiveClass,
} from "@/lib/ui/event-management-ui";
import { matchonScrollablePillItemClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export function EventManagementNavBar({
  eventId,
  publicSlug,
}: {
  eventId: string;
  publicSlug?: string | null;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [hash, setHash] = useState("");
  const items = getEventManagementNavItems(eventId, publicSlug);
  const groups = groupEventManagementNavItems(items);
  const activeGroupId = resolveActiveEventManagementNavGroupId(
    pathname,
    hash,
    eventId,
    items,
    search,
  );
  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ?? groups[0];

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return (
    <div className="min-w-0">
      <nav
        className={cn(
          eventManagementPrimaryNavClass,
          eventManagementContentInsetClass,
          `border-b ${eventManagementBorderColorClass}`,
        )}
        aria-label="대회 관리 대분류"
      >
        {groups.map((group) => {
          const active = group.id === activeGroupId;
          return (
            <Link
              key={group.id}
              href={getEventManagementGroupHref(eventId, group)}
              className={cn(
                eventManagementPrimaryNavLinkBaseClass,
                active
                  ? eventManagementPrimaryNavLinkActiveClass
                  : eventManagementPrimaryNavLinkInactiveClass,
              )}
              aria-current={active ? "true" : undefined}
            >
              {group.label}
            </Link>
          );
        })}
      </nav>

      {activeGroup ? (
        <nav
          className={cn(
            eventManagementSecondaryNavClass,
            eventManagementContentInsetClass,
            `border-b ${eventManagementBorderColorClass}`,
          )}
          aria-label="대회 관리 소분류"
        >
          {activeGroup.items.map((item) => {
            const active = isEventManagementNavItemActive(
              pathname,
              hash,
              eventId,
              item,
              search,
            );
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                  matchonScrollablePillItemClass,
                  eventManagementSecondaryNavLinkBaseClass,
                  active
                    ? eventManagementSecondaryNavLinkActiveClass
                    : eventManagementSecondaryNavLinkInactiveClass,
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
