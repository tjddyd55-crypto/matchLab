import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { PublicEventDivisionList } from "@/components/domain/events/PublicEventDivisionList";
import { PublicEventGallery } from "@/components/domain/events/PublicEventGallery";
import { RecordingStreamingNotice } from "@/components/domain/events/RecordingStreamingNotice";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { PublicEventVenueSection } from "@/components/domain/events/public/PublicEventVenueSection";
import { PublicEventInfoSummaryCard } from "@/components/domain/events/public/PublicEventInfoSummaryCard";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PublicEventOverviewSection({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  const paymentLines = event.paymentInfo?.noticeLines ?? [event.participantFeeNotice];

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <PublicEventInfoSummaryCard event={event} />

      <PublicEventVenueSection event={event} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">대회 개요</CardTitle>
        </CardHeader>
        <CardContent>
          {event.description ? (
            <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {event.description}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">등록된 소개가 없습니다.</p>
          )}
        </CardContent>
      </Card>

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

      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-lg">참가 신청 · 입금 안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
            {paymentLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <EventApplicationCta
            eventStatus={event.status}
            registrationStatus={event.registrationStatus}
          />
        </CardContent>
      </Card>

      <Card className="md:hidden">
        <CardHeader>
          <CardTitle className="text-base">참가 신청 · 입금 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground space-y-1.5 text-xs leading-relaxed">
            {paymentLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {event.streamingConsentRequired ? (
        <FeedbackMessage tone="warning">
          참가 신청 시 촬영 및 스트리밍 노출 동의가 필요합니다.
        </FeedbackMessage>
      ) : null}

      <RecordingStreamingNotice
        photoRecordingEnabled={event.photoRecordingEnabled}
        videoRecordingEnabled={event.videoRecordingEnabled}
        liveStreamingEnabled={event.liveStreamingEnabled}
        streamingNoticeText={event.streamingNoticeText}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">체급 · 경기구분</CardTitle>
        </CardHeader>
        <CardContent>
          {event.divisions.length > 0 ? (
            <PublicEventDivisionList divisions={event.divisions} />
          ) : (
            <FeedbackMessage tone="info">
              주최자가 경기구분 정보를 준비 중입니다.
            </FeedbackMessage>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
