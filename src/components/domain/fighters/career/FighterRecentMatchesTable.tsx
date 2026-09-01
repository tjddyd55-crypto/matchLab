import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { FighterUnifiedRecentMatch } from "@/lib/fighter-unified-profile/types";
import {
  fighterCareerMutedClass,
  fighterCareerTableClass,
  fighterCareerTableWrapClass,
  fighterCareerTdClass,
  fighterCareerThClass,
} from "@/lib/ui/fighter-career-ui";

function formatDate(iso: string) {
  try {
    return format(new Date(iso), "yyyy.MM.dd", { locale: ko });
  } catch {
    return iso.slice(0, 10);
  }
}

export function FighterRecentMatchesTable({
  matches,
  emptyLabel = "공식 경기 기록이 없습니다.",
}: {
  matches: FighterUnifiedRecentMatch[];
  emptyLabel?: string;
}) {
  if (matches.length === 0) {
    return <p className={fighterCareerMutedClass}>{emptyLabel}</p>;
  }

  return (
    <div className={fighterCareerTableWrapClass}>
      <table className={fighterCareerTableClass}>
        <thead>
          <tr>
            <th className={fighterCareerThClass}>일자</th>
            <th className={fighterCareerThClass}>대회</th>
            <th className={fighterCareerThClass}>상대</th>
            <th className={fighterCareerThClass}>체급</th>
            <th className={fighterCareerThClass}>결과</th>
            <th className={fighterCareerThClass}>경기 방식</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.matchResultId}>
              <td className={`${fighterCareerTdClass} whitespace-nowrap tabular-nums text-xs`}>
                {formatDate(m.eventDateIso)}
              </td>
              <td className={`${fighterCareerTdClass} max-w-[160px] truncate font-medium`}>
                {m.eventTitle}
              </td>
              <td className={fighterCareerTdClass}>
                {m.opponentName ?? "—"}
                {m.opponentGymName ? (
                  <span className={`${fighterCareerMutedClass} block`}>
                    {m.opponentGymName}
                  </span>
                ) : null}
              </td>
              <td className={`${fighterCareerTdClass} max-w-[120px] truncate text-xs`}>
                {m.divisionLabel ?? m.weightClass ?? "—"}
              </td>
              <td className={`${fighterCareerTdClass} font-medium`}>{m.resultLabel}</td>
              <td className={`${fighterCareerTdClass} text-xs`}>
                {m.resultTypeLabel ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
