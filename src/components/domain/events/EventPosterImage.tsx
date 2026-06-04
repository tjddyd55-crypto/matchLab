"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { EVENT_POSTER_ASPECT_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

export type EventPosterImageVariant = "card" | "detail" | "uploadPreview";

function posterVariantLayout(variant: EventPosterImageVariant): {
  outer: string;
  box: string;
} {
  switch (variant) {
    case "card":
      return {
        outer:
          "flex w-full justify-center bg-neutral-50 dark:bg-neutral-900/20",
        box: cn(
          EVENT_POSTER_ASPECT_CLASS,
          "relative mx-auto w-[82%] max-w-[300px] overflow-hidden bg-white dark:bg-neutral-900/40",
        ),
      };
    case "detail":
      return {
        outer: "flex w-full justify-center",
        box: cn(
          EVENT_POSTER_ASPECT_CLASS,
          "relative w-full max-w-[420px] overflow-hidden bg-white dark:bg-neutral-900/40",
        ),
      };
    case "uploadPreview":
      return {
        outer: "flex w-full justify-center",
        box: cn(
          EVENT_POSTER_ASPECT_CLASS,
          "relative w-32 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-foreground/10",
        ),
      };
  }
}

function PosterFrame({
  variant,
  className,
  boxClassName,
  overlay,
  children,
}: {
  variant: EventPosterImageVariant;
  className?: string;
  boxClassName?: string;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const layout = posterVariantLayout(variant);
  return (
    <div className={cn(layout.outer, className)}>
      <div className={cn(layout.box, boxClassName)}>
        {overlay ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            {overlay}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function PosterPlaceholder({
  variant,
  className,
  boxClassName,
  label = "대회 포스터",
}: {
  variant: EventPosterImageVariant;
  className?: string;
  boxClassName?: string;
  label?: string;
}) {
  const layout = posterVariantLayout(variant);
  const emptyUpload =
    variant === "uploadPreview" ? "border border-dashed bg-neutral-50" : "";

  return (
    <div className={cn(layout.outer, className)}>
      <div
        className={cn(
          layout.box,
          emptyUpload,
          "flex flex-col items-center justify-center gap-2 text-muted-foreground",
          boxClassName,
        )}
        aria-hidden
      >
        {variant === "uploadPreview" ? (
          <span className="px-2 text-center text-[11px]">{label}</span>
        ) : (
          <>
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
            <span className="text-[11px] font-medium tracking-wide">{label}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function EventPosterImage({
  src,
  alt = "",
  variant = "card",
  className,
  boxClassName,
  imageClassName,
  sizes = "(max-width:768px) 100vw, 33vw",
  priority,
  overlay,
  placeholderLabel,
}: {
  src: string | null | undefined;
  alt?: string;
  variant?: EventPosterImageVariant;
  className?: string;
  boxClassName?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  overlay?: ReactNode;
  placeholderLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src?.trim()) && !failed;

  if (!show) {
    return (
      <PosterPlaceholder
        variant={variant}
        className={className}
        boxClassName={boxClassName}
        label={placeholderLabel}
      />
    );
  }

  return (
    <PosterFrame
      variant={variant}
      className={className}
      boxClassName={boxClassName}
      overlay={overlay}
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
    </PosterFrame>
  );
}
