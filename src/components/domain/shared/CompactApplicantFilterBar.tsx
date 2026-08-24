import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 주최자 목록용 한 줄 compact 필터 바 표면 */
export const compactApplicantFilterBarClass =
  "rounded-[10px] border border-[#E2E8F0] bg-matchon-surface/70 p-2.5 md:p-3";

export const compactApplicantFilterRowClass =
  "flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-1.5 max-[1365px]:flex-wrap";

export const compactApplicantSearchClass =
  "min-w-0 w-full md:w-[220px] md:max-w-[220px] md:flex-none xl:w-[240px] xl:max-w-[240px]";

/** 신청자 관리 — 1366에서 검색~초기화 1줄 */
export const compactOrganizerApplicantSearchClass =
  "min-w-0 w-full md:w-[180px] md:max-w-[180px] md:flex-none xl:w-[200px] xl:max-w-[200px]";

export const compactOrganizerApplicantControlClass =
  "h-9 min-h-9 px-2.5 text-xs";

export const compactApplicantSelectWidths = {
  gym: "w-full min-w-0 md:w-[8.5rem] md:shrink-0 min-[1366px]:w-[6.25rem]",
  division: "w-full min-w-0 md:w-[9rem] md:shrink-0 min-[1366px]:w-[6.75rem]",
  checkIn: "w-full min-w-0 md:w-[9.25rem] md:shrink-0 min-[1366px]:w-[7.25rem]",
  status: "w-full min-w-0 md:w-[8rem] md:shrink-0 min-[1366px]:w-[6.25rem]",
  payment: "w-full min-w-0 md:w-[7.5rem] md:shrink-0 min-[1366px]:w-[5.75rem]",
  consent: "w-full min-w-0 md:w-[7.5rem] md:shrink-0 min-[1366px]:w-[5.75rem]",
  assignment: "w-full min-w-0 md:w-[7rem] md:shrink-0 min-[1366px]:w-[5.5rem]",
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
      className={cn("h-9 min-h-9 shrink-0 px-3 md:w-auto", className)}
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
