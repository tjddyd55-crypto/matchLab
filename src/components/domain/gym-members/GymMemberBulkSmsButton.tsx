"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BulkSmsComposeDialog } from "@/components/domain/messaging/BulkSmsComposeDialog";
import {
  previewGymBulkSmsAction,
  sendGymBulkSmsAction,
} from "@/features/messaging/bulk-sms-actions";

export function GymMemberBulkSmsButton({
  memberIds,
  selectedIds,
}: {
  memberIds: string[];
  selectedIds: string[];
}) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const fighter = searchParams.get("fighter") ?? undefined;
  const hasFilters = Boolean(q?.trim() || status || fighter);

  const scope = selectedIds.length > 0 ? "selected" : "filtered";
  const selectionLabel =
    selectedIds.length > 0
      ? `선택 ${selectedIds.length}명`
      : hasFilters
        ? "현재 필터 결과"
        : `전체 회원 (${memberIds.length}명)`;

  const effectiveIds = selectedIds.length > 0 ? selectedIds : undefined;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        문자 보내기
      </Button>
      <BulkSmsComposeDialog
        open={open}
        onOpenChange={setOpen}
        title="회원 단체 문자"
        targetLabel={selectionLabel}
        stats={null}
        onPreview={async (message) => {
          const preview = await previewGymBulkSmsAction({
            scope,
            memberIds: effectiveIds,
            q,
            status,
            fighterFilter: fighter,
            message,
          });
          return {
            requestedCount: preview.requestedCount,
            eligibleCount: preview.eligibleCount,
            excludedCount: preview.excludedCount,
          };
        }}
        onSend={async (message, idempotencyKey) =>
          sendGymBulkSmsAction({
            scope,
            memberIds: effectiveIds,
            q,
            status,
            fighterFilter: fighter,
            message,
            idempotencyKey,
          })
        }
      />
    </>
  );
}
