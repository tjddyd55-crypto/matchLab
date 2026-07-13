import type { AdminAuditLogListItemDTO } from "@/lib/dto/admin";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminDesktopTableClass,
  adminMobileCardClass,
  adminMobileCardHeaderClass,
  adminMobileListClass,
  adminMutedTextClass,
} from "@/lib/ui/admin-ui";

export function AdminAuditLogsTable({
  rows,
}: {
  rows: AdminAuditLogListItemDTO[];
}) {
  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="감사 로그가 없습니다"
        description="기록된 감사 로그가 없습니다."
      />
    );
  }

  return (
    <>
      <div className={adminDesktopTableClass}>
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead>시각</TableHead>
              <TableHead>액션</TableHead>
              <TableHead>대상 타입</TableHead>
              <TableHead>대상 ID</TableHead>
              <TableHead>작업자</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className={`${adminMutedTextClass} whitespace-nowrap`}>
                  {formatAdminDateTime(l.createdAt)}
                </TableCell>
                <TableCell className="font-mono text-xs break-all">{l.action}</TableCell>
                <TableCell>{l.targetType}</TableCell>
                <TableCell className={`${adminMutedTextClass} font-mono text-xs break-all`}>
                  {l.targetId ?? "—"}
                </TableCell>
                <TableCell className="text-xs break-words">{l.actorLabel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={adminMobileListClass}>
        {rows.map((l) => (
          <li key={l.id}>
            <Card className={adminMobileCardClass}>
              <CardHeader className={adminMobileCardHeaderClass}>
                <CardTitle className={`${adminMutedTextClass} text-xs font-normal`}>
                  {formatAdminDateTime(l.createdAt)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-3 text-xs">
                <p className="font-mono break-all">
                  {l.action} · {l.targetType}
                </p>
                <p className={`${adminMutedTextClass} font-mono break-all`}>
                  {l.targetId ?? "—"}
                </p>
                <p className="break-words">작업자: {l.actorLabel}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
