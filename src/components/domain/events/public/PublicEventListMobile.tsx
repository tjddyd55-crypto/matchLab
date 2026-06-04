import { PublicEventCardMobile } from "@/components/domain/events/public/PublicEventCardMobile";
import type { PublicEventListItemDTO } from "@/lib/dto/public";

export function PublicEventListMobile({
  events,
}: {
  events: PublicEventListItemDTO[];
}) {
  return (
    <ul className="flex flex-col gap-4 md:hidden">
      {events.map((e, i) => (
        <li key={e.id}>
          <PublicEventCardMobile event={e} priorityImage={i < 2} />
        </li>
      ))}
    </ul>
  );
}
