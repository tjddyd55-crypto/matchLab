import type { AdminAuditLogListItemDTO } from "@/lib/dto/admin";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";

export function AdminAuditLogsTable({ rows }: { rows: AdminAuditLogListItemDTO[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">감사 로그가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-2 pr-2">시각</th>
              <th className="py-2 pr-2">액션</th>
              <th className="py-2 pr-2">대상 타입</th>
              <th className="py-2 pr-2">대상 ID</th>
              <th className="py-2">작업자</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="text-muted-foreground py-2 pr-2 whitespace-nowrap">
                  {formatAdminDateTime(l.createdAt)}
                </td>
                <td className="py-2 pr-2 font-mono text-xs">{l.action}</td>
                <td className="py-2 pr-2">{l.targetType}</td>
                <td className="text-muted-foreground py-2 pr-2 font-mono text-xs">
                  {l.targetId ?? "—"}
                </td>
                <td className="py-2 text-xs">{l.actorLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((l) => (
          <li key={l.id} className="rounded-lg border bg-card p-3 text-sm">
            <p className="text-muted-foreground text-xs">{formatAdminDateTime(l.createdAt)}</p>
            <p className="mt-1 font-mono text-xs">
              {l.action} · {l.targetType}
            </p>
            <p className="text-muted-foreground font-mono text-xs">{l.targetId ?? "—"}</p>
            <p className="mt-1 text-xs">작업자: {l.actorLabel}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
