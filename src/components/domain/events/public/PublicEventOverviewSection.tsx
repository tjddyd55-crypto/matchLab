import type { ReactNode } from "react";
import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { PublicEventDivisionList } from "@/components/domain/events/PublicEventDivisionList";
import { PublicEventGallery } from "@/components/domain/events/PublicEventGallery";
import { RecordingStreamingNotice } from "@/components/domain/events/RecordingStreamingNotice";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { PublicEventVenueSection } from "@/components/domain/events/public/PublicEventVenueSection";
import { PublicEventInfoSummaryCard } from "@/components/domain/events/public/PublicEventInfoSummaryCard";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { matchonSectionTitleClass, matchonStatCardClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

function OverviewCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(matchonStatCardClass, className)}>
      <h2 className={cn(matchonSectionTitleClass, "mb-4")}>{title}</h2>
      {children}
    </section>
  );
}

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

      <OverviewCard title="대회 개요">
        {event.description ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-matchon-text-secondary">
            {event.description}
          </div>
        ) : (
          <p className="text-sm text-matchon-text-secondary">
            등록된 소개가 없습니다.
          </p>
        )}
      </OverviewCard>

      {event.posterUrl && event.galleryImages.length > 0 ? (
        <section className="space-y-3">
          <h2 className={matchonSectionTitleClass}>
            포스터 · 상세 이미지
          </h2>
          <PublicEventGallery images={event.galleryImages} />
        </section>
      ) : event.galleryImages.length > 0 ? (
        <PublicEventGallery images={event.galleryImages} />
      ) : null}

      <OverviewCard title="참가 신청 · 입금 안내" className="hidden md:block">
        <ul className="space-y-2 text-sm leading-relaxed text-matchon-text-secondary">
          {paymentLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="mt-4">
          <EventApplicationCta
            eventStatus={event.status}
            registrationStatus={event.registrationStatus}
          />
        </div>
      </OverviewCard>

      <OverviewCard title="참가 신청 · 입금 안내" className="md:hidden">
        <ul className="space-y-1.5 text-xs leading-relaxed text-matchon-text-secondary">
          {paymentLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </OverviewCard>

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

      <OverviewCard title="체급 · 경기구분">
        {event.divisions.length > 0 ? (
          <PublicEventDivisionList divisions={event.divisions} />
        ) : (
          <FeedbackMessage tone="info">
            주최자가 경기구분 정보를 준비 중입니다.
          </FeedbackMessage>
        )}
      </OverviewCard>
    </div>
  );
}
