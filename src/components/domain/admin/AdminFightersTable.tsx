import type { AdminFighterListItemDTO } from "@/lib/dto/admin";
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
  getAdminFighterStatusLabel,
  resolveAdminFighterStatusMatchon,
} from "@/lib/ui/admin-ui";

export function AdminFightersTable({
  rows,
}: {
  rows: AdminFighterListItemDTO[];
}) {
  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="선수 데이터가 없습니다"
        description="등록된 선수가 없습니다."
      />
    );
  }

  return (
    <>
      <div className={adminDesktopTableClass}>
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>성별</TableHead>
              <TableHead>소속 체육관</TableHead>
              <TableHead>전적</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>등록</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">{f.fighterCode}</TableCell>
                <TableCell className="font-medium break-words">{f.name}</TableCell>
                <TableCell className={`${adminMutedTextClass} text-xs`}>{f.gender}</TableCell>
                <TableCell className={`${adminMutedTextClass} break-words`}>
                  {f.currentGymName ?? "—"}
                </TableCell>
                <TableCell className="text-xs tabular-nums">{f.recordSummary}</TableCell>
                <TableCell>
                  <MatchonStatusBadge
                    status={resolveAdminFighterStatusMatchon(f.status)}
                    label={getAdminFighterStatusLabel(f.status)}
                    size="sm"
                  />
                </TableCell>
                <TableCell className={`${adminMutedTextClass} whitespace-nowrap text-xs`}>
                  {formatAdminDateTime(f.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={adminMobileListClass}>
        {rows.map((f) => (
          <li key={f.id}>
            <Card className={adminMobileCardClass}>
              <CardHeader className={adminMobileCardHeaderClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base break-words">
                    {f.name}{" "}
                    <span className={`${adminMutedTextClass} font-mono text-xs font-normal`}>
                      ({f.fighterCode})
                    </span>
                  </CardTitle>
                  <MatchonStatusBadge
                    status={resolveAdminFighterStatusMatchon(f.status)}
                    label={getAdminFighterStatusLabel(f.status)}
                    size="sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-3 text-xs">
                <p className={`${adminMutedTextClass} break-words`}>
                  {f.gender} · {f.currentGymName ?? "무소속"} · {f.recordSummary}
                </p>
                <p className={`${adminMutedTextClass} mt-1`}>
                  {formatAdminDateTime(f.createdAt)}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
