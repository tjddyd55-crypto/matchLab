import type { PublicEventDetailDTO } from "@/lib/dto/public";
import {
  spectatorWatchTabLabel,
  type SpectatorWatchTabId,
} from "@/lib/public-event-watch";

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function SpectatorWatchHeader({
  event,
  activeTab,
}: {
  event: Pick<
    PublicEventDetailDTO,
    "title" | "eventDate" | "location" | "locationName" | "organizerName"
  >;
  activeTab: SpectatorWatchTabId;
}) {
  const place = event.locationName ?? event.location;

  return (
    <header className="space-y-3 border-b bg-background px-4 pb-4 pt-5">
      <p className="text-primary text-sm font-black tracking-[0.2em]">MATCHON</p>
      <div>
        <h1 className="text-xl font-bold leading-snug">{event.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {formatEventDate(event.eventDate)}
          {place ? ` · ${place}` : ""}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          주최 {event.organizerName}
        </p>
      </div>
      <p className="text-foreground text-lg font-semibold">
        {spectatorWatchTabLabel(activeTab)}
      </p>
    </header>
  );
}
