"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  previewAdditionalInfoBulkAction,
  requestAdditionalInfoBulkAction,
} from "@/features/additional-info/actions";
import type { AdditionalInfoBulkPreview } from "@/lib/services/additional-info.service";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BulkMode = "adults" | "minors" | "ids";

const EMPTY_PREVIEW: AdditionalInfoBulkPreview = {
  targetCount: 0,
  sendableCount: 0,
  contactMissingCount: 0,
  alreadyRequestedCount: 0,
  completedCount: 0,
};

export function OrganizerAdditionalInfoBulkDialog({
  eventId,
  rows,
  selectedIds,
  open,
  onOpenChange,
}: {
  eventId: string;
  rows: OrganizerApplicationRowVM[];
  selectedIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<BulkMode>("adults");
  const [preview, setPreview] =
    useState<AdditionalInfoBulkPreview>(EMPTY_PREVIEW);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const clientPreview = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (mode === "adults") return !r.isMinor;
      if (mode === "minors") return r.isMinor;
      return selectedIds.includes(r.applicationId);
    });
    let sendableCount = 0;
    let contactMissingCount = 0;
    let alreadyRequestedCount = 0;
    let completedCount = 0;
    for (const r of filtered) {
      if (r.additionalInfoStatus === "COMPLETED") {
        completedCount += 1;
        continue;
      }
      if (
        r.additionalInfoStatus === "REQUESTED" ||
        r.additionalInfoStatus === "IN_PROGRESS"
      ) {
        alreadyRequestedCount += 1;
      }
      if (r.contactMissing) contactMissingCount += 1;
      else sendableCount += 1;
    }
    return {
      targetCount: filtered.length,
      sendableCount,
      contactMissingCount,
      alreadyRequestedCount,
      completedCount,
    } satisfies AdditionalInfoBulkPreview;
  }, [rows, mode, selectedIds]);

  function loadServerPreview(nextMode: BulkMode) {
    setMode(nextMode);
    setMessage(null);
    startTransition(async () => {
      const res = await previewAdditionalInfoBulkAction(
        eventId,
        nextMode,
        nextMode === "ids" ? selectedIds : undefined,
      );
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error.message });
        return;
      }
      setPreview(res.data);
    });
  }

  function runBulk() {
    setMessage(null);
    startTransition(async () => {
      const res = await requestAdditionalInfoBulkAction({
        eventId,
        mode,
        applicationIds: mode === "ids" ? selectedIds : undefined,
      });
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error.message });
        return;
      }
      setPreview(res.data.preview);
      setMessage({
        tone: res.data.successCount > 0 ? "success" : "info",
        text: `발송 성공 ${res.data.successCount}건 / 실패·스킵 ${res.data.results.length - res.data.successCount}건 (Development dry-run)`,
      });
      router.refresh();
    });
  }

  const display = preview.targetCount > 0 ? preview : clientPreview;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setPreview(EMPTY_PREVIEW);
          loadServerPreview(selectedIds.length > 0 ? "ids" : "adults");
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>추가정보 요청</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["adults", "성인"],
              ["minors", "미성년"],
              ["ids", "선택"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={mode === value ? "default" : "outline"}
              disabled={pending || (value === "ids" && selectedIds.length === 0)}
              onClick={() => loadServerPreview(value)}
            >
              {label}
              {value === "ids" ? ` (${selectedIds.length})` : ""}
            </Button>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-2 text-sm">
          <li className="rounded border px-2 py-1.5">
            대상 <strong className="float-right">{display.targetCount}</strong>
          </li>
          <li className="rounded border px-2 py-1.5">
            발송가능{" "}
            <strong className="float-right">{display.sendableCount}</strong>
          </li>
          <li className="rounded border px-2 py-1.5">
            연락처없음{" "}
            <strong className="float-right text-red-700">
              {display.contactMissingCount}
            </strong>
          </li>
          <li className="rounded border px-2 py-1.5">
            이미요청{" "}
            <strong className="float-right">
              {display.alreadyRequestedCount}
            </strong>
          </li>
          <li className="col-span-2 rounded border px-2 py-1.5">
            완료{" "}
            <strong className="float-right text-emerald-700">
              {display.completedCount}
            </strong>
          </li>
        </ul>

        {message ? (
          <FeedbackMessage tone={message.tone} className="text-xs">
            {message.text}
          </FeedbackMessage>
        ) : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
          <Button
            type="button"
            disabled={pending || display.sendableCount === 0}
            onClick={() => void runBulk()}
          >
            {pending ? "처리 중…" : "요청 발송"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
