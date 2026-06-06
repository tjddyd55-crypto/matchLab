import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PUBLIC_EVENT_DETAIL_PAGE_CLASS } from "@/components/domain/events/public/public-event-layout";
import { PublicEventDetailHero } from "@/components/domain/events/PublicEventDetailHero";
import { PublicEventDivisionList } from "@/components/domain/events/PublicEventDivisionList";
import { PublicEventGallery } from "@/components/domain/events/PublicEventGallery";
import { PublicEventDetailNavDesktop } from "@/components/domain/events/public/PublicEventDetailNavDesktop";
import { PublicEventDetailNavMobile } from "@/components/domain/events/public/PublicEventDetailNavMobile";
import { RecordingStreamingNotice } from "@/components/domain/events/RecordingStreamingNotice";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { eventService } from "@/lib/services/event.service";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) notFound();

  return (
    <article className={PUBLIC_EVENT_DETAIL_PAGE_CLASS}>
      <PublicEventDetailHero event={event} />

      <PublicEventDetailNavDesktop
        slug={slug}
        showLive={event.liveStreamingEnabled}
      />
      <PublicEventDetailNavMobile
        slug={slug}
        showLive={event.liveStreamingEnabled}
      />

      <section className="space-y-3 rounded-xl border p-4 md:p-5">
        <h2 className="text-base font-semibold md:text-lg">대회 개요</h2>
        {event.description ? (
          <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {event.description}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">등록된 소개가 없습니다.</p>
        )}
      </section>

      {event.posterUrl && event.galleryImages.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold md:text-lg">포스터 · 상세 이미지</h2>
          <PublicEventGallery images={event.galleryImages} />
        </section>
      ) : event.galleryImages.length > 0 ? (
        <PublicEventGallery images={event.galleryImages} />
      ) : null}

      <section className="hidden space-y-4 rounded-xl border p-5 md:block">
        <h2 className="text-lg font-semibold">참가 신청 안내</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {event.participantFeeNotice}
        </p>
        <EventApplicationCta
          eventStatus={event.status}
          registrationStatus={event.registrationStatus}
        />
      </section>

      <section className="space-y-3 rounded-xl border p-4 md:hidden">
        <h2 className="text-base font-semibold">참가 신청</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {event.participantFeeNotice}
        </p>
      </section>

      {event.streamingConsentRequired ? (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          참가 신청 시 촬영 및 스트리밍 노출 동의가 필요합니다.
        </div>
      ) : null}

      <RecordingStreamingNotice
        photoRecordingEnabled={event.photoRecordingEnabled}
        videoRecordingEnabled={event.videoRecordingEnabled}
        liveStreamingEnabled={event.liveStreamingEnabled}
        streamingNoticeText={event.streamingNoticeText}
      />

      <section className="space-y-3 rounded-xl border p-4 md:p-5">
        <h2 className="text-base font-semibold md:text-lg">체급 · 부문</h2>
        {event.divisions.length > 0 ? (
          <PublicEventDivisionList divisions={event.divisions} />
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            주최자가 부문 정보를 준비 중입니다.
          </p>
        )}
      </section>
    </article>
  );
}
