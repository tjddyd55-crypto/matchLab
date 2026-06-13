"use client";

import { useState } from "react";
import { ApplicationStatusBadgesGroup } from "@/components/domain/applications/ApplicationStatusBadgesGroup";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { PaymentStatusControl } from "@/components/domain/payments/PaymentStatusControl";
import {
  approveApplicationFormAction,
  rejectApplicationFormAction,
} from "@/features/applications/actions";
import { Button } from "@/components/ui/button";

function formatAppliedAt(row: OrganizerApplicationRowVM): string {
  const raw = row.appliedAt ?? row.createdAt;
  return new Date(raw).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OrganizerListActions({ row }: { row: OrganizerApplicationRowVM }) {
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:items-end">
      <div className="flex flex-wrap gap-1">
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
        <form action={rejectApplicationFormAction} className="w-full space-y-1.5">
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

const LIST_GRID_CLASS =
  "grid min-w-0 gap-x-3 gap-y-2 py-3 text-sm [grid-template-columns:minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] max-xl:[grid-template-columns:minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] max-xl:[&_.col-payment]:col-span-2 max-xl:[&_.col-actions]:col-span-2";

export function OrganizerApplicationsList({
  rows,
  onOpenDetail,
}: {
  rows: OrganizerApplicationRowVM[];
  onOpenDetail: (row: OrganizerApplicationRowVM) => void;
}) {
  return (
    <div className="hidden min-w-0 md:block">
      <div className="text-muted-foreground hidden border-b px-1 pb-2 text-xs font-medium xl:grid xl:gap-x-3 xl:[grid-template-columns:minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <span>선수</span>
        <span>체육관</span>
        <span>부문/체급</span>
        <span>상태</span>
        <span>입금</span>
        <span>신청일</span>
        <span className="text-right">액션</span>
      </div>

      <ul className="divide-border min-w-0 divide-y">
        {rows.map((row) => (
          <li key={row.applicationId} className={LIST_GRID_CLASS}>
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 text-left"
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
              <span className="min-w-0 truncate font-medium underline-offset-2 hover:underline">
                {row.fighterName}
              </span>
            </button>

            <div className="min-w-0 truncate text-sm">{row.gymName}</div>

            <div
              className="text-muted-foreground min-w-0 text-xs leading-snug"
              title={row.divisionLabel}
            >
              <span className="line-clamp-2 break-words">{row.divisionLabel}</span>
            </div>

            <div className="min-w-0">
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
                layout="wrap"
                compact
              />
            </div>

            <div className="col-payment min-w-0">
              <PaymentStatusControl
                paymentId={row.paymentId}
                paymentStatus={row.paymentStatus}
                compact
              />
            </div>

            <div className="text-muted-foreground min-w-0 text-xs">
              {formatAppliedAt(row)}
            </div>

            <div className="col-actions min-w-0">
              <OrganizerListActions row={row} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
