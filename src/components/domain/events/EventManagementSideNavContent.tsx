"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EVENT_MANAGEMENT_NAV_ICONS } from "@/components/domain/events/event-management-nav-icons";
import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import {
  getEventManagementNavItems,
  groupEventManagementNavItems,
  isEventManagementNavItemActive,
} from "@/lib/ui/event-management-navigation";
import {
  eventManagementSideNavBackLinkClass,
  eventManagementSideNavGroupLabelClass,
  eventManagementSideNavHeaderClass,
  eventManagementSideNavLinkActiveClass,
  eventManagementSideNavLinkBaseClass,
  eventManagementSideNavLinkInactiveClass,
  eventManagementSideNavMenuClass,
  eventManagementSideNavTitleClass,
} from "@/lib/ui/event-management-ui";
import { cn } from "@/lib/utils";

export function EventManagementSideNavContent({
  eventId,
  publicSlug,
  eventTitle,
  eventStatus,
  registrationStatus,
  onNavigate,
  className,
}: {
  eventId: string;
  publicSlug?: string | null;
  eventTitle: string;
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [hash, setHash] = useState("");
  const items = getEventManagementNavItems(eventId, publicSlug);
  const groups = groupEventManagementNavItems(items);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className={eventManagementSideNavHeaderClass}>
        <Link
          href="/organizer/events"
          className={eventManagementSideNavBackLinkClass}
          onClick={onNavigate}
        >
          <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
          내 대회 목록
        </Link>
        <p
          className={eventManagementSideNavTitleClass}
          title={eventTitle}
        >
          {eventTitle}
        </p>
        <EventStatusBadges
          eventStatus={eventStatus}
          registrationStatus={registrationStatus}
          className="mt-2"
          emphasizeRegistration
        />
      </div>

      <nav
        className={eventManagementSideNavMenuClass}
        aria-label="대회 관리 메뉴"
      >
        {groups.map((group) => (
          <div key={group.id}>
            <p className={eventManagementSideNavGroupLabelClass}>
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isEventManagementNavItemActive(
                  pathname,
                  hash,
                  eventId,
                  item,
                  search,
                );
                const Icon = EVENT_MANAGEMENT_NAV_ICONS[item.icon];
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        eventManagementSideNavLinkBaseClass,
                        active
                          ? eventManagementSideNavLinkActiveClass
                          : eventManagementSideNavLinkInactiveClass,
                      )}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
