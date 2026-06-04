import { PublicEventCardDesktop } from "@/components/domain/events/public/PublicEventCardDesktop";
import type { PublicEventListItemDTO } from "@/lib/dto/public";

export function PublicEventListDesktop({
  events,
}: {
  events: PublicEventListItemDTO[];
}) {
  return (
    <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((e, i) => (
        <PublicEventCardDesktop key={e.id} event={e} priorityImage={i < 4} />
      ))}
    </div>
  );
}
