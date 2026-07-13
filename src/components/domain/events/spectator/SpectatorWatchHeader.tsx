import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { MatchonLogo } from "@/components/common/MatchonLogo";
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
    <header className="space-y-3 border-b border-matchon-border bg-white px-4 pb-4 pt-5">
      <MatchonLogo size="sm" variant="light" />
      <div>
        <h1 className="text-xl font-bold leading-snug text-matchon-text-primary">
          {event.title}
        </h1>
        <p className="mt-1 text-sm text-matchon-text-secondary">
          {formatEventDate(event.eventDate)}
          {place ? ` · ${place}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-matchon-text-secondary">
          주최 {event.organizerName}
        </p>
      </div>
      <p className="text-lg font-semibold text-matchon-text-primary">
        {spectatorWatchTabLabel(activeTab)}
      </p>
    </header>
  );
}
