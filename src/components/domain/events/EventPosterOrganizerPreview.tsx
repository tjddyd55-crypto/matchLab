"use client";

import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EVENT_POSTER_PREVIEW_CAPTION } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

/**
 * 주최자 업로드·생성 폼 — 공개 카드와 동일한 4:5 contain 미리보기
 */
export function EventPosterOrganizerPreview({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <EventPosterImage
        src={src}
        alt="포스터 미리보기"
        variant="uploadPreview"
        sizes="160px"
        placeholderLabel="미리보기 없음"
      />
      <p className="text-muted-foreground max-w-[11rem] text-[11px] leading-snug">
        {EVENT_POSTER_PREVIEW_CAPTION}
      </p>
    </div>
  );
}
