"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ORGANIZER_COMPACT_ACTION_BAR_CLASS } from "@/lib/organizer-dashboard-layout";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { formatBulkApplicationResultSummary } from "@/lib/bulk-application-result-feedback";
import type { BulkApplicationAction } from "@/lib/services/application-organizer-bulk.service";
import { bulkApplicationActionFormAction } from "@/features/applications/bulk-actions";
import { EventApplicantBulkSmsButton } from "@/components/domain/applications/EventApplicantBulkSmsButton";

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
  onRequestAdditionalInfo,
  messagingFeatureEnabled,
}: {
  eventId: string;
  gymId: string | null;
  gymName: string | null;
  selectedIds: string[];
  onClearSelection: () => void;
  onRequestAdditionalInfo?: () => void;
  messagingFeatureEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] =
    useState<BulkApplicationAction | null>(null);

  const showBar = selectedIds.length > 0 || Boolean(onRequestAdditionalInfo);
  if (!showBar) return null;

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
        setMessage({ tone: "error", text: res.error.message });
        return;
      }
      setMessage({
        tone: res.data.successCount > 0 ? "success" : "info",
        text: formatBulkApplicationResultSummary(res.data),
      });
      if (res.data.successCount > 0) {
        onClearSelection();
      }
      router.refresh();
    });
  }

  const primaryActions = (
    ["confirm_payment_approve"] as BulkApplicationAction[]
  );
  const dangerActions = (
    ["organizer_cancel", "mark_gym_cancelled"] as BulkApplicationAction[]
  );

  return (
    <div className={ORGANIZER_COMPACT_ACTION_BAR_CLASS}>
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {selectedIds.length > 0
              ? `${gymName ? `${gymName} · ` : ""}선택 ${selectedIds.length}명`
              : "추가정보 일괄 요청"}
          </p>
          {onRequestAdditionalInfo ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRequestAdditionalInfo}
            >
              추가정보 요청
            </Button>
          ) : null}
        </div>

        {selectedIds.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {messagingFeatureEnabled ? (
                <EventApplicantBulkSmsButton
                  eventId={eventId}
                  selectedApplicationIds={selectedIds}
                />
              ) : null}
              {primaryActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={pending}
                  onClick={() => setConfirmAction(action)}
                >
                  {ACTION_LABELS[action]}
                </Button>
              ))}
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

            <div className="flex flex-wrap gap-2 border-t pt-3">
              {dangerActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => setConfirmAction(action)}
                >
                  {ACTION_LABELS[action]}
                </Button>
              ))}
            </div>
          </>
        ) : null}

        {confirmAction ? (
          <Card variant="default" className="py-3">
            <CardContent className="space-y-2 px-4 text-sm">
              <p>
                {gymName
                  ? `선택한 체육관(${gymName})의 신청자 ${selectedIds.length}명을 `
                  : `선택한 신청자 ${selectedIds.length}명을 `}
                「{ACTION_LABELS[confirmAction]}」 처리하시겠습니까?
              </p>
              <div className="flex flex-wrap gap-2">
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
            </CardContent>
          </Card>
        ) : null}

        {message ? (
          <FeedbackMessage
            tone={message.tone}
            role={message.tone === "error" ? "alert" : "status"}
            className="whitespace-pre-line text-xs"
          >
            {message.text}
          </FeedbackMessage>
        ) : null}
      </div>
    </div>
  );
}

