"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EventManagementSideNavContent } from "@/components/domain/events/EventManagementSideNavContent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import {
  getEventManagementNavItems,
  resolveActiveEventManagementNavItem,
} from "@/lib/ui/event-management-navigation";
import { eventManagementMobileBarClass } from "@/lib/ui/event-management-ui";
import { cn } from "@/lib/utils";

export function EventManagementNavigationSheet({
  eventId,
  publicSlug,
  eventTitle,
  eventStatus,
  registrationStatus,
}: {
  eventId: string;
  publicSlug?: string | null;
  eventTitle: string;
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [hash, setHash] = useState("");

  const items = getEventManagementNavItems(eventId, publicSlug);
  const activeItem = resolveActiveEventManagementNavItem(
    pathname,
    hash,
    eventId,
    items,
    search,
  );

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return (
    <>
      <div className={eventManagementMobileBarClass}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#0F172A]">
            {activeItem?.label ?? "대회 관리"}
          </p>
          <p className="truncate text-xs text-[#64748B]">{eventTitle}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-4" aria-hidden />
          대회 메뉴
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className={cn(
            "fixed top-0 left-0 h-full max-h-none w-[min(100%,280px)] max-w-[280px] translate-x-0 translate-y-0 rounded-none rounded-r-xl border-r p-0 sm:max-w-[280px]",
            "data-open:slide-in-from-left data-closed:slide-out-to-left",
          )}
        >
          <DialogTitle className="sr-only">대회 관리 메뉴</DialogTitle>
          <div className="h-full overflow-y-auto overscroll-contain">
            <EventManagementSideNavContent
              eventId={eventId}
              publicSlug={publicSlug}
              eventTitle={eventTitle}
              eventStatus={eventStatus}
              registrationStatus={registrationStatus}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
