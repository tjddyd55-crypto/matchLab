"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  OrganizerResolveOtherDivisionDialog,
  type ResolveOtherDivisionOption,
} from "@/components/domain/applications/OrganizerResolveOtherDivisionDialog";
import {
  getOrganizerApplicationDisplayStatusLabel,
  isPaidForOrganizerDisplay,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import { findBulkApplicationFailureReason } from "@/lib/bulk-application-result-feedback";
import type { BulkApplicationAction } from "@/lib/services/application-organizer-bulk.service";
import { bulkApplicationActionFormAction } from "@/features/applications/bulk-actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<BulkApplicationAction, string> = {
  confirm_payment_approve: "입금확인(승인)",
  organizer_cancel: "주최측취소",
  mark_gym_cancelled: "체육관취소 처리",
};

function canRunAction(
  row: OrganizerApplicationRowVM,
  action: BulkApplicationAction,
): boolean {
  const display = resolveOrganizerApplicationDisplayStatus({
    status: row.applicationStatus,
    cancellationSource: row.cancellationSource,
  });

  switch (action) {
    case "confirm_payment_approve":
      return (
        display === "pending" ||
        (display === "approved" && !isPaidForOrganizerDisplay(row.paymentStatus))
      );
    case "organizer_cancel":
      return display === "pending" || display === "approved";
    case "mark_gym_cancelled":
      return display === "pending" || display === "approved";
    default:
      return false;
  }
}

export function OrganizerApplicationRowActions({
  eventId,
  row,
  divisions = [],
  compact = false,
  touchFriendly = false,
}: {
  eventId: string;
  row: OrganizerApplicationRowVM;
  divisions?: ResolveOtherDivisionOption[];
  compact?: boolean;
  touchFriendly?: boolean;
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const display = resolveOrganizerApplicationDisplayStatus({
    status: row.applicationStatus,
    cancellationSource: row.cancellationSource,
  });
  const statusLabel = getOrganizerApplicationDisplayStatusLabel(display);
  const showResolve = row.divisionReviewRequired === true;

  async function run(action: BulkApplicationAction) {
    const label = ACTION_LABELS[action];
    const isDanger =
      action === "organizer_cancel" || action === "mark_gym_cancelled";
    const ok = await confirm({
      title: `「${label}」 처리할까요?`,
      description: `${row.fighterName} 선수를 「${label}」 처리하시겠습니까?`,
      confirmLabel: action === "organizer_cancel" ? "취소" : "확인",
      variant: isDanger ? "danger" : "default",
    });
    if (!ok) return;
    setFeedback(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("action", action);
    fd.set("applicationIds", row.applicationId);

    startTransition(async () => {
      const res = await bulkApplicationActionFormAction(fd);
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }

      const failureReason = findBulkApplicationFailureReason(
        res.data,
        row.applicationId,
      );
      if (failureReason) {
        setFeedback({ tone: "error", message: failureReason });
        return;
      }
      if (res.data.successCount > 0) {
        setFeedback({ tone: "success", message: `${label} 처리되었습니다.` });
        router.refresh();
      }
    });
  }

  const actions = (
    Object.keys(ACTION_LABELS) as BulkApplicationAction[]
  ).filter((action) => canRunAction(row, action));

  const primaryActions = actions.filter((a) => a === "confirm_payment_approve");
  const dangerActions = actions.filter(
    (a) => a === "organizer_cancel" || a === "mark_gym_cancelled",
  );

  const btnSize = touchFriendly ? "field" : "sm";
  const btnClass = touchFriendly ? "w-full sm:w-auto" : "h-7 px-2 text-xs";

  if (actions.length === 0 && !showResolve) {
    return (
      <span className="text-muted-foreground text-xs">{statusLabel}</span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        compact ? "items-center" : "items-stretch sm:items-end",
      )}
    >
      {showResolve ? (
        <div
          className={cn(
            "flex flex-wrap gap-1.5",
            compact ? "justify-center" : "justify-end",
            touchFriendly && "w-full flex-col sm:flex-row",
          )}
        >
          <Button
            type="button"
            size={btnSize}
            variant="outline"
            className={btnClass}
            disabled={pending}
            onClick={() => setResolveOpen(true)}
          >
            체급 지정
          </Button>
        </div>
      ) : null}

      {primaryActions.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap gap-1.5",
            compact ? "justify-center" : "justify-end",
            touchFriendly && "w-full flex-col sm:flex-row",
          )}
        >
          {primaryActions.map((action) => (
            <Button
              key={action}
              type="button"
              size={btnSize}
              variant="default"
              className={btnClass}
              disabled={pending}
              onClick={() => void run(action)}
            >
              {ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      ) : null}

      {dangerActions.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap gap-1.5 border-t pt-2",
            compact ? "justify-center" : "justify-end",
            touchFriendly && "w-full flex-col sm:flex-row",
          )}
        >
          {dangerActions.map((action) => (
            <Button
              key={action}
              type="button"
              size={btnSize}
              variant="destructive"
              className={btnClass}
              disabled={pending}
              onClick={() => void run(action)}
            >
              {ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      ) : null}

      {feedback ? (
        <FeedbackMessage
          tone={feedback.tone}
          role={feedback.tone === "error" ? "alert" : "status"}
          className="text-xs"
        >
          {feedback.message}
        </FeedbackMessage>
      ) : null}

      <OrganizerResolveOtherDivisionDialog
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        eventId={eventId}
        applicationId={row.applicationId}
        fighterName={row.fighterName}
        gender={row.fighterGender}
        requestedDivisionText={row.requestedDivisionText}
        applicationWeightKg={row.applicationWeightKg}
        recordText={row.recordText}
        careerText={row.careerText}
        divisions={divisions}
      />
    </div>
  );
}
