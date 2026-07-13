import type { AdminMatchResultListItemDTO } from "@/lib/dto/admin";
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
  getAdminMatchRecordStatusLabel,
  resolveAdminMatchRecordStatusMatchon,
} from "@/lib/ui/admin-ui";

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

export function AdminResultsTable({
  rows,
}: {
  rows: AdminMatchResultListItemDTO[];
}) {
  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="결과 데이터가 없습니다"
        description="등록된 경기 결과가 없습니다."
      />
    );
  }

  return (
    <>
      <div className={adminDesktopTableClass}>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>대회</TableHead>
              <TableHead>선수</TableHead>
              <TableHead>상대</TableHead>
              <TableHead>기록</TableHead>
              <TableHead>방식</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>확정</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium break-words">{r.eventTitle}</TableCell>
                <TableCell className="break-words">
                  {r.fighterName}{" "}
                  <span className={`${adminMutedTextClass} text-xs`}>
                    ({r.fighterCode})
                  </span>
                </TableCell>
                <TableCell className={`${adminMutedTextClass} break-words`}>
                  {r.opponentName
                    ? `${r.opponentName} (${r.opponentCode ?? ""})`
                    : "—"}
                </TableCell>
                <TableCell>{outcomeKo(r)}</TableCell>
                <TableCell className={`${adminMutedTextClass} text-xs`}>
                  {r.resultType ?? "—"}
                </TableCell>
                <TableCell>
                  <MatchonStatusBadge
                    status={resolveAdminMatchRecordStatusMatchon(r.status)}
                    label={getAdminMatchRecordStatusLabel(r.status)}
                    size="sm"
                  />
                </TableCell>
                <TableCell className={`${adminMutedTextClass} whitespace-nowrap text-xs`}>
                  {r.confirmedAt ? formatAdminDateTime(r.confirmedAt) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={adminMobileListClass}>
        {rows.map((r) => (
          <li key={r.id}>
            <Card className={adminMobileCardClass}>
              <CardHeader className={adminMobileCardHeaderClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    {r.eventTitle}
                  </CardTitle>
                  <MatchonStatusBadge
                    status={resolveAdminMatchRecordStatusMatchon(r.status)}
                    label={getAdminMatchRecordStatusLabel(r.status)}
                    size="sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-3 text-xs">
                <p className="break-words">
                  {r.fighterName} ({r.fighterCode}) vs {r.opponentName ?? "—"}
                </p>
                <p className={`${adminMutedTextClass} mt-1`}>
                  {outcomeKo(r)} · {r.resultType ?? "—"}
                </p>
                <p className={`${adminMutedTextClass} mt-1`}>
                  확정: {r.confirmedAt ? formatAdminDateTime(r.confirmedAt) : "—"}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
