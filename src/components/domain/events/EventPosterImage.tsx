"use client";

import Image from "next/image";
import { useState } from "react";
import { EVENT_POSTER_ASPECT_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

function PosterPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 bg-neutral-50 text-muted-foreground dark:bg-neutral-900/40",
        EVENT_POSTER_ASPECT_CLASS,
        className,
      )}
      aria-hidden
    >
      <svg
        className="size-10 opacity-40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M8 11l3 3 5-6" />
      </svg>
      <span className="text-[11px] font-medium tracking-wide">대회 포스터</span>
    </div>
  );
}

export function EventPosterImage({
  src,
  alt = "",
  className,
  imageClassName,
  sizes = "(max-width:768px) 100vw, 33vw",
  priority,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src?.trim()) && !failed;

  if (!show) {
    return <PosterPlaceholder className={className} />;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white dark:bg-neutral-900/40",
        EVENT_POSTER_ASPECT_CLASS,
        className,
      )}
    >
      <Image
        src={src!.trim()}
        alt={alt}
        fill
        className={cn("h-full w-full object-contain", imageClassName)}
        sizes={sizes}
        unoptimized
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
