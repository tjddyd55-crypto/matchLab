import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicEventDetailHero } from "@/components/domain/events/PublicEventDetailHero";
import { PublicEventDivisionList } from "@/components/domain/events/PublicEventDivisionList";
import { PublicEventGallery } from "@/components/domain/events/PublicEventGallery";
import { RecordingStreamingNotice } from "@/components/domain/events/RecordingStreamingNotice";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { buttonVariants } from "@/components/ui/button";
import { eventService } from "@/lib/services/event.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) notFound();

  const subLinkClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "justify-center",
  );

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 md:px-6 md:py-10">
      <PublicEventDetailHero event={event} />

      <nav
        className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-4"
        aria-label="대회 하위 페이지"
      >
        <Link href={`/events/${slug}/brackets`} className={subLinkClass}>
          대진표
        </Link>
        <Link href={`/events/${slug}/results`} className={subLinkClass}>
          결과
        </Link>
        {event.liveStreamingEnabled ? (
          <Link href={`/events/${slug}/live`} className={subLinkClass}>
            라이브
          </Link>
        ) : null}
      </nav>

      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">대회 개요</h2>
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
          <h2 className="text-lg font-semibold">포스터 · 상세 이미지</h2>
          <PublicEventGallery images={event.galleryImages} />
        </section>
      ) : event.galleryImages.length > 0 ? (
        <PublicEventGallery images={event.galleryImages} />
      ) : null}

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">참가 신청 안내</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {event.participantFeeNotice}
        </p>
        <EventApplicationCta
          eventStatus={event.status}
          registrationStatus={event.registrationStatus}
        />
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">체급 · 부문</h2>
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
