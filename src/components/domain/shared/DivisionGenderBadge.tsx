import { formatDivisionGenderLabel } from "@/lib/event-division-fields";
import {
  divisionGenderChipClassNames,
  resolveDivisionGenderTone,
} from "@/lib/ui/division-gender-ui";
import { cn } from "@/lib/utils";

/**
 * 성별 chip — division gender token(SSOT) 재사용.
 * short=true면 남/여 한 글자, 아니면 남성/여성으로 표시한다.
 * 같은 화면 안에서는 short 값을 통일해서 사용한다.
 */
export function DivisionGenderBadge({
  gender,
  short = false,
  className,
}: {
  gender: string | null | undefined;
  short?: boolean;
  className?: string;
}) {
  const label = formatDivisionGenderLabel(gender);
  if (!label) return null;

  const tone = resolveDivisionGenderTone(
    gender as "male" | "female" | null | undefined,
  );
  const display = short
    ? tone === "male"
      ? "남"
      : tone === "female"
        ? "여"
        : label
    : label;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none",
        divisionGenderChipClassNames[tone],
        className,
      )}
    >
      {display}
    </span>
  );
}
