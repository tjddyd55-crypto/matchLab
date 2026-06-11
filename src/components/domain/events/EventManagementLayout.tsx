import type { ReactNode } from "react";
import { EventManagementSideNav } from "@/components/domain/events/EventManagementSideNav";
import { MobileEventManagementNav } from "@/components/domain/events/MobileEventManagementNav";
import {
  EVENT_MANAGEMENT_CONTAINER_CLASS,
  EVENT_MANAGEMENT_CONTENT_CLASS,
} from "@/lib/event-management-layout";
import { cn } from "@/lib/utils";

export function EventManagementLayout({
  eventId,
  publicSlug,
  children,
  className,
}: {
  eventId: string;
  publicSlug?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(EVENT_MANAGEMENT_CONTAINER_CLASS, className)}>
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <EventManagementSideNav eventId={eventId} publicSlug={publicSlug} />
        </aside>
        <div className={EVENT_MANAGEMENT_CONTENT_CLASS}>
          <MobileEventManagementNav eventId={eventId} publicSlug={publicSlug} />
          {children}
        </div>
      </div>
    </div>
  );
}
