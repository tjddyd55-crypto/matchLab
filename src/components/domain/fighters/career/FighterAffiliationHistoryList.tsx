import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { FighterUnifiedAffiliationRow } from "@/lib/fighter-unified-profile/types";
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

export function FighterAffiliationHistoryList({
  rows,
}: {
  rows: FighterUnifiedAffiliationRow[];
}) {
  if (rows.length <= 1) return null;

  return (
    <div className={fighterCareerTableWrapClass}>
      <table className={fighterCareerTableClass}>
        <thead>
          <tr>
            <th className={fighterCareerThClass}>체육관</th>
            <th className={fighterCareerThClass}>기간</th>
            <th className={fighterCareerThClass}>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={fighterCareerTdClass}>
                {r.gymName}
                {r.isCurrent ? (
                  <span className={`${fighterCareerMutedClass} ml-1`}>(현재)</span>
                ) : null}
              </td>
              <td className={`${fighterCareerTdClass} text-xs tabular-nums`}>
                {formatDate(r.startDateIso)}
                {" — "}
                {r.endDateIso ? formatDate(r.endDateIso) : "현재"}
              </td>
              <td className={`${fighterCareerTdClass} text-xs`}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
