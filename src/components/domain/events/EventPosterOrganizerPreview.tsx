"use client";

import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { cn } from "@/lib/utils";

/**
 * 주최자 업로드·생성 폼 — 공개 카드와 동일한 4:5 contain 미리보기
 */
export function EventPosterOrganizerPreview({
  src,
  aspectWarning,
  className,
}: {
  src: string | null;
  aspectWarning?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <EventPosterImage
        src={src}
        alt="포스터 미리보기"
        variant="uploadPreview"
        sizes="160px"
        placeholderLabel="미리보기 없음"
      />
      {aspectWarning ? (
        <p
          className="max-w-xs text-xs leading-relaxed text-amber-800 dark:text-amber-200"
          role="status"
        >
          {aspectWarning}
        </p>
      ) : null}
    </div>
  );
}
