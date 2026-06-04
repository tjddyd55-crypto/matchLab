import { PublicEventCardDesktop } from "@/components/domain/events/public/PublicEventCardDesktop";
import { PUBLIC_EVENTS_GRID_DESKTOP_CLASS } from "@/components/domain/events/public/public-event-layout";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import { cn } from "@/lib/utils";

export function PublicEventListDesktop({
  events,
  className,
}: {
  events: PublicEventListItemDTO[];
  className?: string;
}) {
  return (
    <div className={cn(PUBLIC_EVENTS_GRID_DESKTOP_CLASS, className)}>
      {events.map((e, i) => (
        <PublicEventCardDesktop key={e.id} event={e} priorityImage={i < 4} />
      ))}
    </div>
  );
}
