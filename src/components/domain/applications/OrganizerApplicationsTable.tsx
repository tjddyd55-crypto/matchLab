"use client";

import { useState } from "react";
import type { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import type {
  ApplicationFormMode,
  CustomFormSnapshot,
} from "@/lib/application-form/custom-form";
import { ApplicationStatusBadgesGroup } from "@/components/domain/applications/ApplicationStatusBadgesGroup";
import { PaymentStatusControl } from "@/components/domain/payments/PaymentStatusControl";
import {
  approveApplicationFormAction,
  rejectApplicationFormAction,
} from "@/features/applications/actions";
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
  paymentId: string | null;
  depositorName: string | null;
  memo: string | null;
  appliedAt: string | null;
  createdAt: string;
  guardianConsentRequired: boolean;
  consentSummaryLabel: string;
  consentFilterKey: string;
  customFormSnapshot: CustomFormSnapshot | null;
  applicationFormMode: ApplicationFormMode;
};

function formatAppliedAt(row: OrganizerApplicationRowVM): string {
  const raw = row.appliedAt ?? row.createdAt;
  return new Date(raw).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrganizerApplicationsTable({
  rows,
  onOpenDetail,
}: {
  rows: OrganizerApplicationRowVM[];
  onOpenDetail: (row: OrganizerApplicationRowVM) => void;
}) {
  return (
    <div className="hidden min-w-0 2xl:block">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[14%]">선수</TableHead>
            <TableHead className="w-[10%]">체육관</TableHead>
            <TableHead className="w-[22%]">부문/체급</TableHead>
            <TableHead className="w-[14%]">상태</TableHead>
            <TableHead className="w-[12%]">입금</TableHead>
            <TableHead className="w-[10%]">신청일</TableHead>
            <TableHead className="w-[18%] text-right">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.applicationId}>
              <TableCell className="align-top">
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-2 text-left"
                  onClick={() => onOpenDetail(row)}
                >
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-md bg-muted">
                    {row.fighterProfileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.fighterProfileImageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[10px] font-semibold">
                        {row.fighterName.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium underline-offset-2 hover:underline">
                      {row.fighterName}
                    </div>
                  </div>
                </button>
              </TableCell>
              <TableCell className="align-top">
                <div className="truncate text-sm">{row.gymName}</div>
              </TableCell>
              <TableCell className="text-muted-foreground align-top text-xs leading-snug">
                <span className="line-clamp-2 break-words">{row.divisionLabel}</span>
              </TableCell>
              <TableCell className="align-top">
                <ApplicationStatusBadgesGroup
                  applicationStatus={row.applicationStatus}
                  paymentStatus={row.paymentStatus}
                  consentSummaryLabel={row.consentSummaryLabel}
                  consentFilterKey={row.consentFilterKey}
                  showPendingPaymentHint={
                    row.applicationStatus === "pending" &&
                    row.paymentStatus === "unpaid"
                  }
                  onBadgeClick={() => onOpenDetail(row)}
                />
              </TableCell>
              <TableCell className="align-top">
                <PaymentStatusControl
                  paymentId={row.paymentId}
                  paymentStatus={row.paymentStatus}
                  compact
                />
              </TableCell>
              <TableCell className="text-muted-foreground align-top text-xs whitespace-nowrap">
                {formatAppliedAt(row)}
              </TableCell>
              <TableCell className="align-top text-right">
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
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1">
        {row.applicationStatus === "pending" ? (
          <form action={approveApplicationFormAction}>
            <input type="hidden" name="applicationId" value={row.applicationId} />
            <Button size="sm" type="submit" variant="default" className="h-7 px-2 text-xs">
              승인
            </Button>
          </form>
        ) : null}
        {row.applicationStatus === "pending" ? (
          <Button
            size="sm"
            type="button"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => setShowReject((v) => !v)}
          >
            반려
          </Button>
        ) : null}
      </div>
      {showReject && row.applicationStatus === "pending" ? (
        <form
          action={rejectApplicationFormAction}
          className="w-full max-w-[12rem] space-y-1.5"
        >
          <input type="hidden" name="applicationId" value={row.applicationId} />
          <textarea
            name="reason"
            rows={2}
            className="border-input bg-background w-full rounded-md border px-2 py-1 text-xs"
            placeholder="반려 사유 (선택)"
            maxLength={1000}
          />
          <Button size="sm" type="submit" variant="destructive" className="h-7 text-xs">
            반려 확정
          </Button>
        </form>
      ) : null}
    </div>
  );
}
