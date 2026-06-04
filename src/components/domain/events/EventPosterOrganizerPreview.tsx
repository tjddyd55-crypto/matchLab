"use client";

import Image from "next/image";
import { EVENT_POSTER_ASPECT_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

/**
 * 주최자 업로드·생성 폼 — 공개 카드와 동일한 4:5 미리보기
 */
export function EventPosterOrganizerPreview({
  src,
  aspectWarning,
  className,
  frameClassName = "w-32",
}: {
  src: string | null;
  aspectWarning?: string | null;
  className?: string;
  frameClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {src ? (
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-foreground/10",
            EVENT_POSTER_ASPECT_CLASS,
            frameClassName,
          )}
        >
          <Image
            src={src}
            alt="포스터 미리보기"
            fill
            className="object-contain"
            sizes="160px"
            unoptimized
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border border-dashed bg-neutral-50 text-center text-[11px] text-muted-foreground",
            EVENT_POSTER_ASPECT_CLASS,
            frameClassName,
          )}
        >
          미리보기 없음
        </div>
      )}
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
