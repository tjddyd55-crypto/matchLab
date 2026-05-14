import type { AdminGymListItemDTO } from "@/lib/dto/admin";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";

export function AdminGymsTable({ rows }: { rows: AdminGymListItemDTO[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">체육관 데이터가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-2 pr-2">이름</th>
              <th className="py-2 pr-2">상태</th>
              <th className="py-2 pr-2">선수</th>
              <th className="py-2 pr-2">신청</th>
              <th className="py-2">등록</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="py-2 pr-2 font-medium">{g.name}</td>
                <td className="py-2 pr-2 text-xs">{g.status}</td>
                <td className="py-2 pr-2 tabular-nums">{g.fighterCount}</td>
                <td className="py-2 pr-2 tabular-nums">{g.applicationCount}</td>
                <td className="text-muted-foreground py-2 whitespace-nowrap text-xs">
                  {formatAdminDateTime(g.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((g) => (
          <li key={g.id} className="rounded-lg border bg-card p-3 text-sm">
            <p className="font-medium">{g.name}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {g.status} · 선수 {g.fighterCount} · 신청 {g.applicationCount}
            </p>
            <p className="text-muted-foreground text-xs">{formatAdminDateTime(g.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
