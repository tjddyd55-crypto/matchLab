"use client";

import Link from "next/link";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { ApplicationStatusBadgesGroup } from "@/components/domain/applications/ApplicationStatusBadgesGroup";
import { PaymentStatusControl } from "@/components/domain/payments/PaymentStatusControl";
import { DrawerPanel } from "@/components/ui/drawer-panel";
import { Button } from "@/components/ui/button";
import {
  approveApplicationFormAction,
  rejectApplicationFormAction,
} from "@/features/applications/actions";
import { useState } from "react";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 text-sm">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function OrganizerApplicationDetailDrawer({
  eventId,
  row,
  open,
  onOpenChange,
}: {
  eventId: string;
  row: OrganizerApplicationRowVM | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [showReject, setShowReject] = useState(false);

  if (!row) return null;

  const appliedLabel = row.appliedAt
    ? new Date(row.appliedAt).toLocaleString("ko-KR")
    : new Date(row.createdAt).toLocaleString("ko-KR");

  return (
    <DrawerPanel
      open={open}
      onOpenChange={(next) => {
        if (!next) setShowReject(false);
        onOpenChange(next);
      }}
      title={row.fighterName}
      description={`${row.gymName} · 신청 상세`}
    >
      <div className="flex flex-col gap-5">
        <dl className="grid gap-4">
          <DetailRow label="체육관">{row.gymName}</DetailRow>
          <DetailRow label="신청 부문/체급">
            <span className="text-sm leading-snug">{row.divisionLabel}</span>
          </DetailRow>
          <DetailRow label="신청 상태">
            <ApplicationStatusBadgesGroup
              applicationStatus={row.applicationStatus}
              paymentStatus={row.paymentStatus}
              consentSummaryLabel={row.consentSummaryLabel}
              consentFilterKey={row.consentFilterKey}
              showPendingPaymentHint={
                row.applicationStatus === "pending" &&
                row.paymentStatus === "unpaid"
              }
              layout="wrap"
            />
          </DetailRow>
          <DetailRow label="보호자 동의">
            {row.guardianConsentRequired
              ? row.consentSummaryLabel
              : "동의 불필요"}
          </DetailRow>
          <DetailRow label="신청일">{appliedLabel}</DetailRow>
          <DetailRow label="입금자명">
            {row.depositorName ?? "—"}
          </DetailRow>
          {row.memo ? (
            <DetailRow label="메모">
              <p className="whitespace-pre-wrap text-sm">{row.memo}</p>
            </DetailRow>
          ) : null}
          <DetailRow label="신청서/문서">
            <Link
              href={`/organizer/events/${eventId}/application-batches`}
              className="text-primary text-sm underline underline-offset-2"
            >
              공식 신청서 묶음에서 확인
            </Link>
          </DetailRow>
        </dl>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">조치</p>
          <PaymentStatusControl
            paymentId={row.paymentId}
            paymentStatus={row.paymentStatus}
          />
          <div className="flex flex-wrap gap-2">
            {row.applicationStatus === "pending" ? (
              <form action={approveApplicationFormAction}>
                <input
                  type="hidden"
                  name="applicationId"
                  value={row.applicationId}
                />
                <Button type="submit" size="sm">
                  승인
                </Button>
              </form>
            ) : null}
            {row.applicationStatus === "pending" ? (
              <Button
                type="button"
                size="sm"
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
              className="space-y-2"
            >
              <input
                type="hidden"
                name="applicationId"
                value={row.applicationId}
              />
              <textarea
                name="reason"
                rows={3}
                className="border-input bg-background w-full rounded-md border px-2 py-1 text-sm"
                placeholder="반려 사유 (선택)"
                maxLength={1000}
              />
              <Button type="submit" size="sm" variant="destructive">
                반려 확정
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </DrawerPanel>
  );
}
