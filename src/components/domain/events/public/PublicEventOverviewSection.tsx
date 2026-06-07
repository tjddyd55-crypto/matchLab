import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { PublicEventDivisionList } from "@/components/domain/events/PublicEventDivisionList";
import { PublicEventGallery } from "@/components/domain/events/PublicEventGallery";
import { RecordingStreamingNotice } from "@/components/domain/events/RecordingStreamingNotice";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { PublicEventInfoSummaryCard } from "@/components/domain/events/public/PublicEventInfoSummaryCard";
import { PublicEventMapLink } from "@/components/domain/events/public/PublicEventMapLink";

export function PublicEventOverviewSection({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  const paymentLines = event.paymentInfo?.noticeLines ?? [event.participantFeeNotice];

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <PublicEventInfoSummaryCard event={event} />

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
          <h2 className="text-base font-semibold md:text-lg">
            포스터 · 상세 이미지
          </h2>
          <PublicEventGallery images={event.galleryImages} />
        </section>
      ) : event.galleryImages.length > 0 ? (
        <PublicEventGallery images={event.galleryImages} />
      ) : null}

      <section className="hidden space-y-4 rounded-xl border p-5 md:block">
        <h2 className="text-lg font-semibold">참가 신청 · 입금 안내</h2>
        <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
          {paymentLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {event.location ? (
          <div className="pt-1">
            <PublicEventMapLink location={event.location} />
          </div>
        ) : null}
        <EventApplicationCta
          eventStatus={event.status}
          registrationStatus={event.registrationStatus}
        />
      </section>

      <section className="space-y-3 rounded-xl border p-4 md:hidden">
        <h2 className="text-base font-semibold">참가 신청 · 입금 안내</h2>
        <ul className="text-muted-foreground space-y-1.5 text-xs leading-relaxed">
          {paymentLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
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
    </div>
  );
}
