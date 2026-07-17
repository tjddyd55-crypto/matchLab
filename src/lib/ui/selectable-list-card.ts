import { cn } from "@/lib/utils";

/**
 * 선택 가능 목록 카드 — 상태 tone과 selected/focus를 분리하는 SSOT.
 * 상태 border는 toneClassName에 두고, 선택은 inset ring으로만 표시한다.
 */
export function getSelectableListCardClass({
  selected,
  toneClassName,
  className,
}: {
  selected: boolean;
  toneClassName: string;
  className?: string;
}): string {
  return cn(
    "flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none",
    toneClassName,
    selected &&
      "shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_var(--matchon-primary,#0A47FF)]",
    "focus-visible:ring-2 focus-visible:ring-matchon-primary focus-visible:ring-offset-2",
    className,
  );
}
