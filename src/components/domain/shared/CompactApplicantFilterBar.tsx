import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 주최자 목록용 한 줄 compact 필터 바 표면 */
export const compactApplicantFilterBarClass =
  "rounded-[14px] border border-[#E2E8F0] bg-matchon-surface/70 p-3 md:p-3.5";

export const compactApplicantFilterRowClass =
  "flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:gap-3";

export const compactApplicantSearchClass =
  "min-w-0 flex-1 md:min-w-[320px]";

export const compactApplicantSelectWidths = {
  gym: "w-full md:w-[180px] md:shrink-0",
  division: "w-full md:w-[220px] md:shrink-0",
  checkIn: "w-full md:w-[170px] md:shrink-0",
  status: "w-full md:w-[150px] md:shrink-0",
  payment: "w-full md:w-[140px] md:shrink-0",
  consent: "w-full md:w-[140px] md:shrink-0",
} as const;

export function CompactFilterResetButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-11 shrink-0 px-3 md:w-auto", className)}
      onClick={onClick}
    >
      초기화
    </Button>
  );
}

export function ListSequenceCell({
  sequence,
  className,
}: {
  sequence: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[2rem] justify-center text-sm font-medium tabular-nums text-matchon-text-secondary",
        className,
      )}
    >
      {sequence}
    </span>
  );
}

export function ListSequenceMobilePrefix({ sequence }: { sequence: number }) {
  return (
    <span className="shrink-0 text-xs font-semibold tabular-nums text-matchon-text-secondary">
      #{sequence}
    </span>
  );
}
