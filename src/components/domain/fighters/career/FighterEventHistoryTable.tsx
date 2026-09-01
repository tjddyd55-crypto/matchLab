import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { FighterUnifiedEventHistoryRow } from "@/lib/fighter-unified-profile/types";
import {
  fighterCareerMutedClass,
  fighterCareerTableClass,
  fighterCareerTableWrapClass,
  fighterCareerTdClass,
  fighterCareerThClass,
} from "@/lib/ui/fighter-career-ui";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "yyyy.MM.dd", { locale: ko });
  } catch {
    return iso.slice(0, 10);
  }
}

export function FighterEventHistoryTable({
  rows,
  emptyLabel = "대회 참가 이력이 없습니다.",
}: {
  rows: FighterUnifiedEventHistoryRow[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className={fighterCareerMutedClass}>{emptyLabel}</p>;
  }

  return (
    <div className={fighterCareerTableWrapClass}>
      <table className={fighterCareerTableClass}>
        <thead>
          <tr>
            <th className={fighterCareerThClass}>대회</th>
            <th className={fighterCareerThClass}>부문</th>
            <th className={fighterCareerThClass}>신청</th>
            <th className={fighterCareerThClass}>경기</th>
            <th className={fighterCareerThClass}>결과</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.applicationId}>
              <td className={`${fighterCareerTdClass} max-w-[180px]`}>
                <span className="block truncate font-medium">{r.eventTitle}</span>
                <span className={`${fighterCareerMutedClass} text-xs`}>
                  {formatDate(r.eventDateIso)}
                </span>
              </td>
              <td className={`${fighterCareerTdClass} max-w-[140px] truncate text-xs`}>
                {r.divisionLabel}
              </td>
              <td className={`${fighterCareerTdClass} text-xs`}>{r.applicationStatus}</td>
              <td className={`${fighterCareerTdClass} text-xs`}>
                {r.hadOfficialMatch ? "있음" : "—"}
              </td>
              <td className={`${fighterCareerTdClass} text-xs font-medium`}>
                {r.resultSummary ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
