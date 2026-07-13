import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { FieldStatusEmptyState } from "@/components/domain/field-status/FieldStatusEmptyState";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { matchonCompactTableWrapClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function GymFieldStatusTable({ rows }: { rows: FieldStatusRowDTO[] }) {
  if (rows.length === 0) {
    return (
      <FieldStatusEmptyState message="승인된 신청 선수가 없습니다. 신청·승인 후 이 화면에서 현장 상태를 확인할 수 있습니다." />
    );
  }

  return (
    <div
      className={cn(
        matchonCompactTableWrapClass,
        "hidden lg:block",
      )}
    >
      <Table className="min-w-[48rem]">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[8rem]">선수명</TableHead>
            <TableHead className="min-w-[12rem]">신청 경기구분</TableHead>
            <TableHead className="min-w-[8rem]">현장 확인</TableHead>
            <TableHead className="min-w-[10rem]">계체 결과</TableHead>
            <TableHead className="min-w-[8rem]">출전 확정</TableHead>
            <TableHead className="min-w-[10rem]">메모</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.applicationId}>
              <TableCell className="font-medium break-words">
                {row.fighterName}
              </TableCell>
              <TableCell className="text-xs break-words">{row.divisionLabel}</TableCell>
              <TableCell>
                <CheckInStatusBadge status={row.checkInStatus} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <WeighInStatusBadge status={row.weighInStatus} />
                  {row.weighInWeightKg != null ? (
                    <span className="text-muted-foreground text-xs">
                      {row.weighInWeightKg}kg
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <EligibilityBadge
                  label={row.eligibilityLabel}
                  isEligible={row.isEligibleForBracket}
                  title={row.eligibilityReason}
                />
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[12rem] text-xs break-words">
                {row.fieldMemo ? row.fieldMemo : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
