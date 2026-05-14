import type { AdminOrganizerListItemDTO } from "@/lib/dto/admin";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";

export function AdminOrganizersTable({ rows }: { rows: AdminOrganizerListItemDTO[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">주최자 데이터가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-2 pr-2">이름</th>
              <th className="py-2 pr-2">타입</th>
              <th className="py-2 pr-2">상태</th>
              <th className="py-2 pr-2">대회 수</th>
              <th className="py-2">등록</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="py-2 pr-2 font-medium">{o.name}</td>
                <td className="text-muted-foreground py-2 pr-2 text-xs">{o.type}</td>
                <td className="py-2 pr-2 text-xs">{o.status}</td>
                <td className="py-2 pr-2 tabular-nums">{o.eventCount}</td>
                <td className="text-muted-foreground py-2 whitespace-nowrap text-xs">
                  {formatAdminDateTime(o.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((o) => (
          <li key={o.id} className="rounded-lg border bg-card p-3 text-sm">
            <p className="font-medium">{o.name}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {o.type} · {o.status} · 대회 {o.eventCount}개
            </p>
            <p className="text-muted-foreground text-xs">{formatAdminDateTime(o.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
