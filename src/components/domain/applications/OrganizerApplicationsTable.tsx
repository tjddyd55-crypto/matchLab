"use client";

import { useState } from "react";
import type { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import { ApplicationPaymentSummary } from "@/components/domain/applications/ApplicationPaymentSummary";
import { PaymentStatusControl } from "@/components/domain/payments/PaymentStatusControl";
import {
  approveApplicationFormAction,
  rejectApplicationFormAction,
} from "@/features/applications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type OrganizerApplicationRowVM = {
  applicationId: string;
  fighterId: string;
  fighterProfileImageUrl: string | null;
  fighterName: string;
  gymId: string;
  gymName: string;
  divisionId: string;
  divisionLabel: string;
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  paymentId: string;
  depositorName: string | null;
  memo: string | null;
  appliedAt: string | null;
  createdAt: string;
  guardianConsentRequired: boolean;
  consentSummaryLabel: string;
  consentFilterKey: string;
};

export function OrganizerApplicationsTable({
  rows,
}: {
  rows: OrganizerApplicationRowVM[];
}) {
  return (
    <div className="hidden lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>선수</TableHead>
            <TableHead>체육관</TableHead>
            <TableHead>부문</TableHead>
            <TableHead>동의</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>입금자명</TableHead>
            <TableHead>신청일</TableHead>
            <TableHead className="text-right">조치</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.applicationId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {row.fighterProfileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.fighterProfileImageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-xs font-semibold">
                        {row.fighterName.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{row.fighterName}</div>
                    <div className="text-muted-foreground text-xs">
                      {row.fighterId.slice(0, 8)}…
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-[140px]">
                <div className="truncate text-sm">{row.gymName}</div>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[160px] text-xs">
                {row.divisionLabel}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {row.consentSummaryLabel}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <ApplicationPaymentSummary
                    applicationStatus={row.applicationStatus}
                    paymentStatus={row.paymentStatus}
                  />
                  {row.applicationStatus === "pending" &&
                  row.paymentStatus === "unpaid" ? (
                    <Badge variant="outline" className="w-fit text-[10px]">
                      입금 미확인 (승인 가능)
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[120px] truncate text-xs">
                {row.depositorName ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {row.appliedAt
                  ? new Date(row.appliedAt).toLocaleString("ko-KR")
                  : new Date(row.createdAt).toLocaleString("ko-KR")}
              </TableCell>
              <TableCell className="text-right">
                <OrganizerRowActions row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrganizerRowActions({ row }: { row: OrganizerApplicationRowVM }) {
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      <PaymentStatusControl
        paymentId={row.paymentId}
        paymentStatus={row.paymentStatus}
      />
      <div className="flex flex-wrap justify-end gap-1">
        {row.applicationStatus === "pending" ? (
          <form action={approveApplicationFormAction}>
            <input type="hidden" name="applicationId" value={row.applicationId} />
            <Button size="sm" type="submit" variant="default">
              승인
            </Button>
          </form>
        ) : null}
        {row.applicationStatus === "pending" ? (
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setShowReject((v) => !v)}
          >
            반려
          </Button>
        ) : null}
      </div>
      {showReject && row.applicationStatus === "pending" ? (
        <form
          action={rejectApplicationFormAction}
          className="w-full max-w-xs space-y-2"
        >
          <input type="hidden" name="applicationId" value={row.applicationId} />
          <textarea
            name="reason"
            rows={2}
            className="border-input bg-background w-full rounded-md border px-2 py-1 text-xs"
            placeholder="반려 사유 (선택)"
            maxLength={1000}
          />
          <Button size="sm" type="submit" variant="destructive">
            반려 확정
          </Button>
        </form>
      ) : null}
    </div>
  );
}
