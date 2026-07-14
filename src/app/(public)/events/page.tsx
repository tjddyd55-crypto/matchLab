import { PublicEventsBoard } from "@/components/domain/events/PublicEventsBoard";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import {
  publicEventPageEyebrowClass,
  publicEventPageTitleClass,
} from "@/components/domain/events/public/public-event-ui";
import { eventService } from "@/lib/services/event.service";
import { matchonPageHeaderStackClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  const events = await eventService.listPublicEvents();
  const sportOptions = [
    ...new Set(
      events.map((e) => e.primarySport).filter((s): s is string => Boolean(s)),
    ),
  ].sort();

  return (
    <div className={cn(PUBLIC_CONTENT_CONTAINER_CLASS, "flex flex-col gap-5 py-8 md:gap-6")}>
      <header className={matchonPageHeaderStackClass}>
        <p className={publicEventPageEyebrowClass}>All Events</p>
        <h1 className={cn(publicEventPageTitleClass, "font-black md:text-[28px]")}>
          대회 공고
        </h1>
      </header>

      <PublicEventsBoard events={events} sportOptions={sportOptions} />
    </div>
  );
}
