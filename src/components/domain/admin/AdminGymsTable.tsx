import type { AdminGymListItemDTO } from "@/lib/dto/admin";
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
  getAdminGymStatusLabel,
  resolveAdminGymStatusMatchon,
} from "@/lib/ui/admin-ui";

export function AdminGymsTable({ rows }: { rows: AdminGymListItemDTO[] }) {
  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="체육관 데이터가 없습니다"
        description="등록된 체육관이 없습니다."
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
              <TableHead>상태</TableHead>
              <TableHead>선수 수</TableHead>
              <TableHead>등록</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium break-words">{g.name}</TableCell>
                <TableCell>
                  <MatchonStatusBadge
                    status={resolveAdminGymStatusMatchon(g.status)}
                    label={getAdminGymStatusLabel(g.status)}
                    size="sm"
                  />
                </TableCell>
                <TableCell className="tabular-nums">{g.fighterCount}</TableCell>
                <TableCell className={`${adminMutedTextClass} whitespace-nowrap text-xs`}>
                  {formatAdminDateTime(g.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={adminMobileListClass}>
        {rows.map((g) => (
          <li key={g.id}>
            <Card className={adminMobileCardClass}>
              <CardHeader className={adminMobileCardHeaderClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <MatchonStatusBadge
                    status={resolveAdminGymStatusMatchon(g.status)}
                    label={getAdminGymStatusLabel(g.status)}
                    size="sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-3 text-xs">
                <p className={adminMutedTextClass}>선수 {g.fighterCount}명</p>
                <p className={`${adminMutedTextClass} mt-1`}>
                  {formatAdminDateTime(g.createdAt)}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
