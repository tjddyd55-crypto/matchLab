import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";

/** 대진표 그룹 헤더 — 경기구분/체급 중심, sport row 반복 없음 */
export function BracketGroupHeader({
  division,
  fallbackTitle,
  titleClassName = "text-xl font-semibold",
}: {
  division: EventDivisionDisplayInput | null;
  fallbackTitle: string;
  titleClassName?: string;
}) {
  if (division) {
    return (
      <DivisionCompactDisplay
        division={division}
        mainClassName={titleClassName}
      />
    );
  }

  return <h2 className={titleClassName}>{fallbackTitle}</h2>;
}
