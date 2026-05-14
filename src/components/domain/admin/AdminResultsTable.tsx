import type { AdminMatchResultListItemDTO } from "@/lib/dto/admin";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";

function outcomeKo(r: AdminMatchResultListItemDTO): string {
  switch (r.result) {
    case "win":
      return "승";
    case "loss":
      return "패";
    case "draw":
      return "무";
    case "no_contest":
      return "무효";
    default:
      return r.result;
  }
}

export function AdminResultsTable({ rows }: { rows: AdminMatchResultListItemDTO[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">결과 데이터가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-2 pr-2">대회</th>
              <th className="py-2 pr-2">선수</th>
              <th className="py-2 pr-2">상대</th>
              <th className="py-2 pr-2">기록</th>
              <th className="py-2 pr-2">방식</th>
              <th className="py-2 pr-2">상태</th>
              <th className="py-2">확정</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-2 font-medium">{r.eventTitle}</td>
                <td className="py-2 pr-2">
                  {r.fighterName}{" "}
                  <span className="text-muted-foreground text-xs">({r.fighterCode})</span>
                </td>
                <td className="text-muted-foreground py-2 pr-2">
                  {r.opponentName
                    ? `${r.opponentName} (${r.opponentCode ?? ""})`
                    : "—"}
                </td>
                <td className="py-2 pr-2">{outcomeKo(r)}</td>
                <td className="text-muted-foreground py-2 pr-2 text-xs">
                  {r.resultType ?? "—"}
                </td>
                <td className="py-2 pr-2 text-xs">{r.status}</td>
                <td className="text-muted-foreground py-2 whitespace-nowrap text-xs">
                  {r.confirmedAt ? formatAdminDateTime(r.confirmedAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border bg-card p-3 text-sm">
            <p className="font-medium">{r.eventTitle}</p>
            <p className="mt-1">
              {r.fighterName} ({r.fighterCode}) vs{" "}
              {r.opponentName ?? "—"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {outcomeKo(r)} · {r.resultType ?? "—"} · {r.status}
            </p>
            <p className="text-muted-foreground text-xs">
              확정: {r.confirmedAt ? formatAdminDateTime(r.confirmedAt) : "—"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
