import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicEventDetailHeader } from "@/components/domain/events/PublicEventDetailHeader";
import { PublicEventDivisionList } from "@/components/domain/events/PublicEventDivisionList";
import { PublicEventGallery } from "@/components/domain/events/PublicEventGallery";
import { RecordingStreamingNotice } from "@/components/domain/events/RecordingStreamingNotice";
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
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 md:px-6">
      <PublicEventDetailHeader event={event} />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
            로그인 후 신청
          </Link>
          <p className="text-muted-foreground max-w-md text-xs sm:pl-2">
            대회 신청은 소속 체육관 계정에서 진행합니다. 참가비와 입금 방법은
            체육관을 통해 안내되며, 공개 페이지에는 계좌번호와 금액이 표시되지
            않습니다.
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-2"
          aria-label="대회 하위 페이지"
        >
          <Link href={`/events/${slug}/brackets`} className={subLinkClass}>
            대진표
          </Link>
          <Link href={`/events/${slug}/live`} className={subLinkClass}>
            라이브
          </Link>
          <Link href={`/events/${slug}/results`} className={subLinkClass}>
            결과
          </Link>
        </nav>
      </div>

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

      <PublicEventGallery images={event.galleryImages} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">대회 소개</h2>
        {event.description ? (
          <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {event.description}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">등록된 설명이 없습니다.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">참가 안내</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {event.participantFeeNotice}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">부문</h2>
        <PublicEventDivisionList divisions={event.divisions} />
      </section>
    </article>
  );
}
