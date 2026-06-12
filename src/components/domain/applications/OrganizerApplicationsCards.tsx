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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function OrganizerCardActions({ row }: { row: OrganizerApplicationRowVM }) {
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
      <PaymentStatusControl
        paymentId={row.paymentId}
        paymentStatus={row.paymentStatus}
      />
      <div className="flex flex-wrap gap-2">
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
        <form action={rejectApplicationFormAction} className="space-y-2">
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

export function OrganizerApplicationsCards({
  rows,
  onOpenDetail,
}: {
  rows: OrganizerApplicationRowVM[];
  onOpenDetail: (row: OrganizerApplicationRowVM) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 2xl:hidden">
      {rows.map((row) => (
        <Card key={row.applicationId}>
          <CardHeader className="pb-2">
            <button
              type="button"
              className="text-left"
              onClick={() => onOpenDetail(row)}
            >
              <CardTitle className="text-base">{row.fighterName}</CardTitle>
              <div className="text-muted-foreground text-xs">{row.gymName}</div>
            </button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="text-muted-foreground line-clamp-2 text-xs">
              {row.divisionLabel}
            </div>
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
            />
            <div className="text-muted-foreground text-xs">
              입금자명 {row.depositorName ?? "—"}
            </div>
            <div className="text-muted-foreground text-xs">
              신청{" "}
              {row.appliedAt
                ? new Date(row.appliedAt).toLocaleString("ko-KR")
                : new Date(row.createdAt).toLocaleString("ko-KR")}
            </div>
            {row.memo ? (
              <div className="rounded-md bg-muted/40 px-2 py-1 text-xs whitespace-pre-wrap">
                메모: {row.memo}
              </div>
            ) : null}
            <OrganizerCardActions row={row} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
