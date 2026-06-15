"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatBulkApplicationResultSummary } from "@/lib/bulk-application-result-feedback";
import type { BulkApplicationAction } from "@/lib/services/application-organizer-bulk.service";
import { bulkApplicationActionFormAction } from "@/features/applications/bulk-actions";

const ACTION_LABELS: Record<BulkApplicationAction, string> = {
  confirm_payment_approve: "입금확인(승인)",
  organizer_cancel: "주최측취소",
  mark_gym_cancelled: "체육관취소 처리",
};

export function OrganizerApplicationsBulkToolbar({
  eventId,
  gymId,
  gymName,
  selectedIds,
  onClearSelection,
}: {
  eventId: string;
  gymId: string | null;
  gymName: string | null;
  selectedIds: string[];
  onClearSelection: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] =
    useState<BulkApplicationAction | null>(null);

  if (selectedIds.length === 0) return null;

  function run(action: BulkApplicationAction) {
    setConfirmAction(null);
    setMessage(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("action", action);
    fd.set("applicationIds", selectedIds.join(","));
    if (gymId) fd.set("gymId", gymId);

    startTransition(async () => {
      const res = await bulkApplicationActionFormAction(fd);
      if (!res.ok) {
        setMessage(res.error.message);
        return;
      }
      setMessage(formatBulkApplicationResultSummary(res.data));
      onClearSelection();
      router.refresh();
    });
  }

  return (
    <div className="ring-foreground/10 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">
        {gymName ? `${gymName} · ` : ""}선택 {selectedIds.length}명
      </p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ACTION_LABELS) as BulkApplicationAction[]).map(
          (action) => (
            <Button
              key={action}
              type="button"
              size="sm"
              variant={action === "organizer_cancel" ? "destructive" : "default"}
              disabled={pending}
              onClick={() => setConfirmAction(action)}
            >
              {ACTION_LABELS[action]}
            </Button>
          ),
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={onClearSelection}
        >
          선택 해제
        </Button>
      </div>
        {confirmAction ? (
        <div className="rounded-md border bg-background p-3 text-sm">
          <p>
            {gymName
              ? `선택한 체육관(${gymName})의 신청자 ${selectedIds.length}명을 `
              : `선택한 신청자 ${selectedIds.length}명을 `}
            「{ACTION_LABELS[confirmAction]}」 처리하시겠습니까?
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => run(confirmAction)}
            >
              확인
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirmAction(null)}
            >
              취소
            </Button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className="text-muted-foreground whitespace-pre-line text-xs">{message}</p>
      ) : null}
    </div>
  );
}
