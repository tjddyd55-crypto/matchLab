import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PublicEventBracketsSection } from "@/components/domain/events/public/PublicEventBracketsSection";
import { PublicEventDetailShell } from "@/components/domain/events/public/PublicEventDetailShell";
import { PublicEventLiveSection } from "@/components/domain/events/public/PublicEventLiveSection";
import { PublicEventOverviewSection } from "@/components/domain/events/public/PublicEventOverviewSection";
import { PublicEventResultsSection } from "@/components/domain/events/public/PublicEventResultsSection";
import { bracketAutoMatchService } from "@/lib/services/bracket-auto-match.service";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { liveStreamService } from "@/lib/services/live-stream.service";
import { resultService } from "@/lib/services/result.service";
import { parsePublicEventTab } from "@/lib/public-event-tabs";
import {
  buildEventPublicUrl,
  buildEventShareDescription,
  buildEventShareTitle,
  resolveEventOgImageForMetadata,
} from "@/lib/share/event-share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) {
    return { title: "대회를 찾을 수 없습니다" };
  }

  const title = buildEventShareTitle(event);
  const description = buildEventShareDescription(event);
  const url = buildEventPublicUrl(event);
  const ogImage = resolveEventOgImageForMetadata(event);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "MatchLab",
      locale: "ko_KR",
      images: [
        {
          url: ogImage,
          alt: `${event.title} 포스터`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) notFound();

  const tab = parsePublicEventTab(sp.tab, {
    showLive: event.liveStreamingEnabled,
  });

  let tabPanel: ReactNode;

  switch (tab) {
    case "brackets": {
      const [brackets, unmatchedCandidates] = await Promise.all([
        bracketService.getPublicBracketsByEventSlug(slug),
        bracketAutoMatchService.listPublicUnmatchedCandidatesByEventSlug(slug),
      ]);
      tabPanel = (
        <PublicEventBracketsSection
          eventId={event.id}
          slug={slug}
          brackets={brackets}
          unmatchedCandidates={unmatchedCandidates}
          publicUnmatchedListEnabled={event.publicUnmatchedListEnabled}
        />
      );
      break;
    }
    case "results": {
      const payload = await resultService.getPublicResultsByEventSlug(slug);
      if (!payload) notFound();
      tabPanel = (
        <PublicEventResultsSection
          eventId={event.id}
          slug={slug}
          eventTitle={payload.eventTitle}
          results={payload.results}
        />
      );
      break;
    }
    case "live": {
      const streams = await liveStreamService.listPublicForEventSlug(slug);
      tabPanel = (
        <PublicEventLiveSection eventTitle={event.title} streams={streams} />
      );
      break;
    }
    default:
      tabPanel = <PublicEventOverviewSection event={event} />;
  }

  return (
    <PublicEventDetailShell event={event} slug={slug} activeTab={tab}>
      {tabPanel}
    </PublicEventDetailShell>
  );
}
