import type { ReactNode } from "react";
import { EventManagementNav } from "@/components/domain/events/EventManagementNav";
import { EVENT_MANAGEMENT_CONTAINER_CLASS } from "@/lib/event-management-layout";
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
      <EventManagementNav eventId={eventId} publicSlug={publicSlug} />
      {children}
    </div>
  );
}
