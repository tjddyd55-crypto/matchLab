"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BulkSmsComposeDialog } from "@/components/domain/messaging/BulkSmsComposeDialog";
import {
  previewEventApplicantBulkSmsAction,
  sendEventApplicantBulkSmsAction,
} from "@/features/messaging/bulk-sms-actions";

export function EventApplicantBulkSmsButton({
  eventId,
  selectedApplicationIds,
}: {
  eventId: string;
  selectedApplicationIds: string[];
}) {
  const [open, setOpen] = useState(false);

  if (selectedApplicationIds.length === 0) return null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        문자 보내기 ({selectedApplicationIds.length}명)
      </Button>
      <BulkSmsComposeDialog
        open={open}
        onOpenChange={setOpen}
        title="신청자 단체 문자"
        targetLabel={`선택 신청자 ${selectedApplicationIds.length}명`}
        stats={null}
        onPreview={async (message) => {
          const preview = await previewEventApplicantBulkSmsAction({
            eventId,
            applicationIds: selectedApplicationIds,
            message,
          });
          return {
            requestedCount: preview.requestedCount,
            eligibleCount: preview.eligibleCount,
            excludedCount: preview.excludedCount,
          };
        }}
        onSend={async (message, idempotencyKey) =>
          sendEventApplicantBulkSmsAction({
            eventId,
            applicationIds: selectedApplicationIds,
            message,
            idempotencyKey,
          })
        }
      />
    </>
  );
}
