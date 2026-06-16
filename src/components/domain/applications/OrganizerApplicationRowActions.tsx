"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  getOrganizerApplicationDisplayStatusLabel,
  isPaidForOrganizerDisplay,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import { findBulkApplicationFailureReason } from "@/lib/bulk-application-result-feedback";
import type { BulkApplicationAction } from "@/lib/services/application-organizer-bulk.service";
import { bulkApplicationActionFormAction } from "@/features/applications/bulk-actions";
import { Button } from "@/components/ui/button";

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
  compact = false,
}: {
  eventId: string;
  row: OrganizerApplicationRowVM;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const display = resolveOrganizerApplicationDisplayStatus({
    status: row.applicationStatus,
    cancellationSource: row.cancellationSource,
  });
  const statusLabel = getOrganizerApplicationDisplayStatusLabel(display);

  function run(action: BulkApplicationAction) {
    const label = ACTION_LABELS[action];
    if (!window.confirm(`${row.fighterName} 선수를 「${label}」 처리하시겠습니까?`)) {
      return;
    }
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("action", action);
    fd.set("applicationIds", row.applicationId);

    startTransition(async () => {
      const res = await bulkApplicationActionFormAction(fd);
      if (!res.ok) {
        window.alert(res.error.message);
        return;
      }

      const failureReason = findBulkApplicationFailureReason(
        res.data,
        row.applicationId,
      );
      if (failureReason) {
        window.alert(failureReason);
      }
      if (res.data.successCount > 0) {
        router.refresh();
      }
    });
  }

  const actions = (
    Object.keys(ACTION_LABELS) as BulkApplicationAction[]
  ).filter((action) => canRunAction(row, action));

  if (actions.length === 0) {
    return (
      <span className="text-muted-foreground text-xs">{statusLabel}</span>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap justify-end gap-1"
          : "flex flex-col items-end gap-1.5"
      }
    >
      {actions.map((action) => (
        <Button
          key={action}
          type="button"
          size="sm"
          variant={action === "organizer_cancel" ? "destructive" : "default"}
          className="h-7 px-2 text-xs"
          disabled={pending}
          onClick={() => run(action)}
        >
          {ACTION_LABELS[action]}
        </Button>
      ))}
    </div>
  );
}
