import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { EventDetailHeroDesktop } from "@/components/domain/events/public/EventDetailHeroDesktop";
import { EventDetailHeroMobile } from "@/components/domain/events/public/EventDetailHeroMobile";

export function PublicEventDetailHero({ event }: { event: PublicEventDetailDTO }) {
  return (
    <>
      <EventDetailHeroDesktop event={event} />
      <EventDetailHeroMobile event={event} />
    </>
  );
}
