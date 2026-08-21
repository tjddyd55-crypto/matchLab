"use client";

import { cn } from "@/lib/utils";
import type { AdditionalInfoBadgeTone } from "@/lib/additional-info/completion";

const TONE_CLASS: Record<AdditionalInfoBadgeTone, string> = {
  muted: "bg-muted text-muted-foreground",
  blue: "bg-sky-100 text-sky-800",
  amber: "bg-amber-100 text-amber-900",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
};

export function AdditionalInfoStatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: AdditionalInfoBadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
        TONE_CLASS[tone],
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}
