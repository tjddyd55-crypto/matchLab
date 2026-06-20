import { Suspense } from "react";
import type { Metadata } from "next";
import { SpectatorBracketTab } from "@/components/domain/events/spectator/SpectatorBracketTab";
import { SpectatorLiveTab } from "@/components/domain/events/spectator/SpectatorLiveTab";
import { SpectatorResultsTab } from "@/components/domain/events/spectator/SpectatorResultsTab";
import { SpectatorWatchRefresh } from "@/components/domain/events/spectator/SpectatorWatchRefresh";
import { SpectatorWatchShell } from "@/components/domain/events/spectator/SpectatorWatchShell";
import {
  SpectatorWatchAccessClosed,
  SpectatorWatchNotFound,
} from "@/components/domain/events/spectator/SpectatorWatchStates";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { liveStreamService } from "@/lib/services/live-stream.service";
import { resultService } from "@/lib/services/result.service";
import { loadPublicSpectatorGuardBySlug } from "@/lib/public-spectator-guard";
import {
  parseSpectatorWatchTab,
  spectatorWatchTabLabel,
} from "@/lib/public-event-watch";
import { spectatorAccessStateMessage } from "@/lib/spectator-access";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const event = await eventService.getPublicEventBySlug(slug);
  const tab = parseSpectatorWatchTab(sp.tab);
  if (!event) {
    return { title: "관람 · 대회를 찾을 수 없습니다" };
  }
  return {
    title: `${event.title} · ${spectatorWatchTabLabel(tab)}`,
    description: `${event.title} 관람객용 ${spectatorWatchTabLabel(tab)}`,
  };
}

export default async function SpectatorWatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab = parseSpectatorWatchTab(sp.tab);

  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) {
    return <SpectatorWatchNotFound />;
  }

  const guard = await loadPublicSpectatorGuardBySlug(slug);
  if (guard && !guard.accessible) {
    const copy = spectatorAccessStateMessage(guard.state);
    return (
      <SpectatorWatchAccessClosed
        slug={slug}
        title={copy.title}
        message={`${event.title} — ${copy.description}`}
      />
    );
  }

  const [brackets, resultsPayload, streams] = await Promise.all([
    bracketService.getPublicBracketsByEventSlug(slug),
    resultService.getPublicResultsByEventSlug(slug),
    event.liveStreamingEnabled
      ? liveStreamService.listPublicForEventSlug(slug)
      : Promise.resolve([]),
  ]);

  const results = resultsPayload?.results ?? [];

  let tabContent;
  switch (tab) {
    case "results":
      tabContent = (
        <SpectatorResultsTab
          eventId={event.id}
          slug={slug}
          results={results}
        />
      );
      break;
    case "live":
      tabContent = (
        <SpectatorLiveTab
          streams={streams}
          liveStreamingEnabled={event.liveStreamingEnabled}
        />
      );
      break;
    default:
      tabContent = (
        <SpectatorBracketTab
          eventId={event.id}
          slug={slug}
          brackets={brackets}
        />
      );
  }

  return (
    <SpectatorWatchShell event={event} slug={slug} activeTab={tab}>
      <Suspense fallback={null}>
        <SpectatorWatchRefresh tab={tab} />
      </Suspense>
      {tabContent}
    </SpectatorWatchShell>
  );
}
