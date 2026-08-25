import Link from "next/link";
import type { AdminAuditLogListItemDTO } from "@/lib/dto/admin";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { adminMutedTextClass } from "@/lib/ui/admin-ui";

export function AdminOrganizationAuditList({
  rows,
}: {
  rows: AdminAuditLogListItemDTO[];
}) {
  if (rows.length === 0) {
    return (
      <p className={`${adminMutedTextClass} text-sm`}>
        이 조직에 연결된 운영기록이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-matchon-border">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="border-b bg-matchon-surface/50 text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">일시</th>
            <th className="px-3 py-2 font-medium">작업</th>
            <th className="px-3 py-2 font-medium">대상</th>
            <th className="px-3 py-2 font-medium">처리자</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className={`${adminMutedTextClass} whitespace-nowrap px-3 py-2 text-xs`}>
                {formatAdminDateTime(row.createdAt)}
              </td>
              <td className="px-3 py-2">{row.action}</td>
              <td className={`${adminMutedTextClass} px-3 py-2 text-xs`}>
                {row.targetType}
                {row.targetId ? ` · ${row.targetId.slice(0, 8)}…` : ""}
              </td>
              <td className="px-3 py-2">{row.actorLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`${adminMutedTextClass} px-3 py-2 text-xs`}>
        전체 감사 로그는{" "}
        <Link
          href="/admin/audit-logs"
          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
        >
          감사
        </Link>
        에서 확인할 수 있습니다.
      </p>
    </div>
  );
}
