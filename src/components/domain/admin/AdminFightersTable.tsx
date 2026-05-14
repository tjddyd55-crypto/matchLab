import type { AdminFighterListItemDTO } from "@/lib/dto/admin";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";

export function AdminFightersTable({ rows }: { rows: AdminFighterListItemDTO[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">선수 데이터가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-2 pr-2">코드</th>
              <th className="py-2 pr-2">이름</th>
              <th className="py-2 pr-2">성별</th>
              <th className="py-2 pr-2">소속 체육관</th>
              <th className="py-2 pr-2">전적</th>
              <th className="py-2 pr-2">상태</th>
              <th className="py-2">등록</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="py-2 pr-2 font-mono text-xs">{f.fighterCode}</td>
                <td className="py-2 pr-2 font-medium">{f.name}</td>
                <td className="text-muted-foreground py-2 pr-2 text-xs">{f.gender}</td>
                <td className="text-muted-foreground py-2 pr-2">{f.currentGymName ?? "—"}</td>
                <td className="py-2 pr-2 tabular-nums text-xs">{f.recordSummary}</td>
                <td className="py-2 pr-2 text-xs">{f.status}</td>
                <td className="text-muted-foreground py-2 whitespace-nowrap text-xs">
                  {formatAdminDateTime(f.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((f) => (
          <li key={f.id} className="rounded-lg border bg-card p-3 text-sm">
            <p className="font-medium">
              {f.name}{" "}
              <span className="text-muted-foreground font-mono text-xs">({f.fighterCode})</span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {f.gender} · {f.currentGymName ?? "무소속"} · {f.recordSummary} · {f.status}
            </p>
            <p className="text-muted-foreground text-xs">{formatAdminDateTime(f.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
