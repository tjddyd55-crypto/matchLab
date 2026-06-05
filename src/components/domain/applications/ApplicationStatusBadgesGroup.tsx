"use client";

import type { ReactNode } from "react";
import type { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { ConsentStatusBadge } from "@/components/domain/applications/ConsentStatusBadge";
import { PaymentStatusBadge } from "@/components/domain/payments/PaymentStatusBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ApplicationStatusBadgesGroup({
  applicationStatus,
  paymentStatus,
  consentSummaryLabel,
  consentFilterKey,
  showPendingPaymentHint,
  onBadgeClick,
  layout = "column",
}: {
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  consentSummaryLabel: string;
  consentFilterKey: string;
  showPendingPaymentHint?: boolean;
  onBadgeClick?: () => void;
  layout?: "column" | "wrap";
}) {
  const clickable = Boolean(onBadgeClick);
  const badgeBtnClass = cn(
    clickable &&
      "cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  const wrap = (node: ReactNode) =>
    clickable ? (
      <button type="button" className={badgeBtnClass} onClick={onBadgeClick}>
        {node}
      </button>
    ) : (
      node
    );

  return (
    <div
      className={cn(
        "min-w-[150px]",
        layout === "column"
          ? "flex flex-col items-start gap-1.5"
          : "flex flex-wrap items-center gap-1.5",
      )}
    >
      {wrap(<ApplicationStatusBadge status={applicationStatus} />)}
      {wrap(<PaymentStatusBadge status={paymentStatus} />)}
      {wrap(
        <ConsentStatusBadge
          label={consentSummaryLabel}
          filterKey={consentFilterKey}
        />,
      )}
      {showPendingPaymentHint ? (
        wrap(
          <Badge variant="outline" className="whitespace-nowrap text-[10px]">
            입금 미확인 (승인 가능)
          </Badge>,
        )
      ) : null}
    </div>
  );
}
