"use client";

import { useState } from "react";
import { ApplicationPaymentSummary } from "@/components/domain/applications/ApplicationPaymentSummary";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { PaymentStatusControl } from "@/components/domain/payments/PaymentStatusControl";
import {
  approveApplicationFormAction,
  rejectApplicationFormAction,
} from "@/features/applications/actions";
import { Badge } from "@/components/ui/badge";
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
}: {
  rows: OrganizerApplicationRowVM[];
}) {
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      {rows.map((row) => (
        <Card key={row.applicationId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{row.fighterName}</CardTitle>
            <div className="text-muted-foreground text-xs">{row.gymName}</div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="text-muted-foreground text-xs">{row.divisionLabel}</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-muted-foreground">보호자 동의</span>
              <span>{row.consentSummaryLabel}</span>
            </div>
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
