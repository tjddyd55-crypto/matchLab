"use client";

import { MATCH_ORGANIZER_MEMO_MAX_LENGTH } from "@/lib/brackets/match-organizer-memo";
import { cn } from "@/lib/utils";

const matchOrganizerMemoTextareaClass =
  "border-input bg-background min-h-[2.5rem] max-h-[5.5rem] w-full min-w-0 resize-y rounded-md border px-2 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MatchOrganizerMemoInput({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}>
      <textarea
        className={matchOrganizerMemoTextareaClass}
        rows={1}
        maxLength={MATCH_ORGANIZER_MEMO_MAX_LENGTH}
        value={value}
        disabled={disabled}
        placeholder="경기 편성 사유 또는 운영 메모를 입력하세요."
        aria-label="경기 운영 메모"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
