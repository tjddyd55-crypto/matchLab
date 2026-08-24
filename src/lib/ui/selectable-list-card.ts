import { cn } from "@/lib/utils";

/**
 * 선택 가능 목록 카드 — 상태 tone과 selected/focus를 분리하는 SSOT.
 * 선택: full primary border-2 + #EAF1FF (경기 운영 / 현장 계체 동일).
 */
export function getSelectableListCardClass({
  selected,
  toneClassName,
  selectedStyle = "ring",
  className,
}: {
  selected: boolean;
  toneClassName: string;
  /**
   * ring | soft — 동일 선택 스타일(호환 alias).
   * soft는 과거 현장 계체용이며 ring과 픽셀 동일.
   */
  selectedStyle?: "ring" | "soft";
  className?: string;
}): string {
  void selectedStyle;
  return cn(
    "flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-[10px] border px-2.5 py-2.5 text-left transition-colors outline-none",
    toneClassName,
    selected &&
      "border-2 border-[#0A47FF] bg-[#EAF1FF] shadow-none hover:bg-[#EAF1FF]",
    "focus-visible:ring-2 focus-visible:ring-matchon-primary focus-visible:ring-offset-1",
    className,
  );
}
