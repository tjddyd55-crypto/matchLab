import type { AdminOrganizerListItemDTO } from "@/lib/dto/admin";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
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
  getAdminOrganizerStatusLabel,
  resolveAdminOrganizerStatusMatchon,
} from "@/lib/ui/admin-ui";

export function AdminOrganizersTable({
  rows,
}: {
  rows: AdminOrganizerListItemDTO[];
}) {
  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="주최자 데이터가 없습니다"
        description="등록된 주최자가 없습니다."
      />
    );
  }

  return (
    <>
      <div className={adminDesktopTableClass}>
        <Table className="min-w-[480px]">
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>타입</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>대회 수</TableHead>
              <TableHead>등록</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium break-words">{o.name}</TableCell>
                <TableCell className={`${adminMutedTextClass} text-xs`}>{o.type}</TableCell>
                <TableCell>
                  <MatchonStatusBadge
                    status={resolveAdminOrganizerStatusMatchon(o.status)}
                    label={getAdminOrganizerStatusLabel(o.status)}
                    size="sm"
                  />
                </TableCell>
                <TableCell className="tabular-nums">{o.eventCount}</TableCell>
                <TableCell className={`${adminMutedTextClass} whitespace-nowrap text-xs`}>
                  {formatAdminDateTime(o.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={adminMobileListClass}>
        {rows.map((o) => (
          <li key={o.id}>
            <Card className={adminMobileCardClass}>
              <CardHeader className={adminMobileCardHeaderClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{o.name}</CardTitle>
                  <MatchonStatusBadge
                    status={resolveAdminOrganizerStatusMatchon(o.status)}
                    label={getAdminOrganizerStatusLabel(o.status)}
                    size="sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-3 text-xs">
                <p className={adminMutedTextClass}>
                  {o.type} · 대회 {o.eventCount}개
                </p>
                <p className={`${adminMutedTextClass} mt-1`}>
                  {formatAdminDateTime(o.createdAt)}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
