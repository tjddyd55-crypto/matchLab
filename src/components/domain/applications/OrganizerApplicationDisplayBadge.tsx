"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ApplicationCancellationSource,
  PaymentStatus,
} from "@/generated/prisma";
import { ApplicationStatus } from "@/generated/prisma";
import {
  approveApplicationAction,
  revokeApplicationApprovalAction,
} from "@/features/applications/actions";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import {
  getOrganizerApplicationDisplayStatusLabel,
  getOrganizerPaymentDisplayLabel,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import {
  resolveApplicationDisplayMatchonStatus,
  resolvePaymentDisplayMatchonStatus,
} from "@/lib/ui/application-ui";
import { cn } from "@/lib/utils";

export function OrganizerApplicationStatusBadge({
  applicationStatus,
  cancellationSource,
}: {
  applicationStatus: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
}) {
  const display = resolveOrganizerApplicationDisplayStatus({
    status: applicationStatus,
    cancellationSource,
  });
  return (
    <MatchonStatusBadge
      status={resolveApplicationDisplayMatchonStatus({
        status: applicationStatus,
        cancellationSource,
      })}
      label={getOrganizerApplicationDisplayStatusLabel(display)}
      size="sm"
    />
  );
}

/** 미승인↔승인 빠른 전환 — SSOT action + AppConfirmDialog */
export function OrganizerApplicationStatusBadgeToggle({
  eventId,
  applicationId,
  fighterName,
  applicationStatus,
  cancellationSource,
}: {
  eventId: string;
  applicationId: string;
  fighterName: string;
  applicationStatus: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
}) {
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] =
    useState<ApplicationStatus | null>(null);

  useEffect(() => {
    setOptimisticStatus(null);
  }, [applicationStatus]);

  const effectiveStatus = optimisticStatus ?? applicationStatus;
  const display = resolveOrganizerApplicationDisplayStatus({
    status: effectiveStatus,
    cancellationSource,
  });
  const toggleable = display === "pending" || display === "approved";

  async function handleToggle() {
    if (!toggleable || pending) return;

    if (display === "pending") {
      const ok = await confirm({
        title: "신청 승인",
        description: `${fighterName} 선수의 신청을 승인하시겠습니까?`,
        confirmLabel: "승인",
      });
      if (!ok) return;

      startTransition(async () => {
        const fd = new FormData();
        fd.set("applicationId", applicationId);
        fd.set("eventId", eventId);
        const res = await approveApplicationAction(fd);
        if (!res.ok) {
          await alert({ title: "승인 실패", description: res.error.message });
          return;
        }
        setOptimisticStatus(ApplicationStatus.approved);
        router.refresh();
      });
      return;
    }

    const ok = await confirm({
      title: "승인 취소",
      description: `${fighterName} 선수의 승인을 취소하시겠습니까?`,
      confirmLabel: "승인 취소",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", applicationId);
      fd.set("eventId", eventId);
      const res = await revokeApplicationApprovalAction(fd);
      if (!res.ok) {
        await alert({ title: "승인 취소 실패", description: res.error.message });
        return;
      }
      setOptimisticStatus(ApplicationStatus.pending);
      router.refresh();
    });
  }

  const badge = (
    <OrganizerApplicationStatusBadge
      applicationStatus={effectiveStatus}
      cancellationSource={cancellationSource}
    />
  );

  if (!toggleable) {
    return badge;
  }

  const label = getOrganizerApplicationDisplayStatusLabel(display);

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={pending}
      className={cn(
        "inline-flex min-h-9 min-w-[3.25rem] items-center justify-center rounded-md p-1",
        "transition-colors hover:bg-muted/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
      aria-label={
        display === "pending"
          ? `${label} — 클릭하여 승인`
          : `${label} — 클릭하여 승인 취소`
      }
      title={
        display === "pending"
          ? "클릭하여 승인"
          : "클릭하여 승인 취소"
      }
    >
      {badge}
    </button>
  );
}

export function OrganizerPaymentDisplayBadge({
  paymentStatus,
}: {
  paymentStatus: PaymentStatus;
}) {
  return (
    <MatchonStatusBadge
      status={resolvePaymentDisplayMatchonStatus(paymentStatus)}
      label={getOrganizerPaymentDisplayLabel(paymentStatus)}
      size="sm"
    />
  );
}
