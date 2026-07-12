"use client";

import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { CheckInStatusBadge } from "@/components/domain/field-status/CheckInStatusBadge";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { GymEventApplicationStatusRowDTO } from "@/lib/services/gym-event-status.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function GymEventStatusTable({
  rows,
  onOpenDetail,
}: {
  rows: GymEventApplicationStatusRowDTO[];
  onOpenDetail: (row: GymEventApplicationStatusRowDTO) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="hidden overflow-x-auto rounded-xl border lg:block">
      <Table className="min-w-[72rem]">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[8rem]">선수명</TableHead>
            <TableHead className="min-w-[12rem]">경기구분/체급</TableHead>
            <TableHead className="min-w-[10rem]">신청·입금</TableHead>
            <TableHead className="min-w-[8rem]">신청서</TableHead>
            <TableHead className="min-w-[8rem]">현장 확인</TableHead>
            <TableHead className="min-w-[8rem]">계체</TableHead>
            <TableHead className="min-w-[8rem]">출전 확정</TableHead>
            <TableHead className="min-w-[10rem]">대진/경기</TableHead>
            <TableHead className="min-w-[6rem]">결과</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.applicationId}
              className="cursor-pointer"
              onClick={() => onOpenDetail(row)}
            >
              <TableCell className="font-medium break-words">
                {row.fighterName}
              </TableCell>
              <TableCell className="text-xs break-words">{row.divisionLabel}</TableCell>
              <TableCell>
                <div className="flex flex-col flex-wrap gap-1">
                  <ApplicationStatusBadge status={row.applicationStatus} />
                  <PaymentStatusBadge status={row.paymentStatus} />
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  variant="outline"
                  label={row.applicationFormStatusLabel}
                />
              </TableCell>
              <TableCell>
                <CheckInStatusBadge status={row.checkInStatus} />
              </TableCell>
              <TableCell>
                <WeighInStatusBadge status={row.weighInStatus} />
              </TableCell>
              <TableCell>
                <EligibilityBadge
                  label={row.eligibilityLabel}
                  isEligible={row.isEligibleForBracket}
                  title={row.eligibilityReason}
                />
              </TableCell>
              <TableCell className="text-xs">
                {row.bracketGenerated ? (
                  <div className="flex flex-col gap-1">
                    <span>
                      {row.bracketAssigned ? "배정됨" : "미배정"}
                    </span>
                    {row.matchSummary ? (
                      <span className="text-muted-foreground">
                        {row.matchSummary}
                      </span>
                    ) : null}
                    {row.matchStatusLabel ? (
                      <span className="text-muted-foreground">
                        {row.matchStatusLabel}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-muted-foreground">대진 미생성</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                {row.resultSummary ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
