"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  OrganizerResolveOtherDivisionDialog,
  type ResolveOtherDivisionOption,
} from "@/components/domain/applications/OrganizerResolveOtherDivisionDialog";
import { OrganizerApplicationEditPanel } from "@/components/domain/applications/OrganizerApplicationEditPanel";
import {
  getOrganizerApplicationDisplayStatusLabel,
  isPaidForOrganizerDisplay,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import { findBulkApplicationFailureReason } from "@/lib/bulk-application-result-feedback";
import type { BulkApplicationAction } from "@/lib/services/application-organizer-bulk.service";
import { bulkApplicationActionFormAction } from "@/features/applications/bulk-actions";
import {
  permanentlyDeleteOrganizerApplicationAction,
  restoreGymCancelledApplicationAction,
  restoreOrganizerCancelledApplicationAction,
} from "@/features/applications/actions";
import type { OrganizerManualRegistrationOptionsDTO } from "@/lib/services/application.service";
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
  manualRegistrationOptions,
  compact = false,
  touchFriendly = false,
}: {
  eventId: string;
  row: OrganizerApplicationRowVM;
  divisions?: ResolveOtherDivisionOption[];
  manualRegistrationOptions?: OrganizerManualRegistrationOptionsDTO;
  compact?: boolean;
  touchFriendly?: boolean;
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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
  const canRestoreOrganizer = display === "organizer_cancelled";
  const canRestoreGym = display === "gym_cancelled";
  const canPermanentDelete = true;

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  async function runBulk(action: BulkApplicationAction) {
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

  async function runRestore(kind: "organizer" | "gym") {
    const label = kind === "organizer" ? "취소 복구" : "체육관취소 복구";
    const ok = await confirm({
      title: `「${label}」 할까요?`,
      description: `${row.fighterName} 선수의 취소를 원상복구합니다. 신청 ID는 유지됩니다.`,
      confirmLabel: "복구",
    });
    if (!ok) return;
    setMenuOpen(false);
    setFeedback(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("applicationId", row.applicationId);
    startTransition(async () => {
      const res =
        kind === "organizer"
          ? await restoreOrganizerCancelledApplicationAction(fd)
          : await restoreGymCancelledApplicationAction(fd);
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      setFeedback({ tone: "success", message: `${label}되었습니다.` });
      router.refresh();
    });
  }

  async function runPermanentDelete() {
    const ok = await confirm({
      title: "신청자를 영구 삭제할까요?",
      description: `${row.fighterName} 선수의 신청 정보를 완전히 삭제합니다.\n이 작업은 되돌릴 수 없습니다.\n다시 신청하려면 새로 등록해야 합니다.`,
      confirmLabel: "영구 삭제",
      variant: "danger",
    });
    if (!ok) return;
    setMenuOpen(false);
    setFeedback(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("applicationId", row.applicationId);
    startTransition(async () => {
      const res = await permanentlyDeleteOrganizerApplicationAction(fd);
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      setFeedback({ tone: "success", message: "영구 삭제되었습니다." });
      router.refresh();
    });
  }

  const primaryActions = (
    Object.keys(ACTION_LABELS) as BulkApplicationAction[]
  ).filter(
    (action) =>
      action === "confirm_payment_approve" && canRunAction(row, action),
  );

  const menuItems: Array<{
    key: string;
    label: string;
    danger?: boolean;
    onClick: () => void;
  }> = [];
  if (canRunAction(row, "organizer_cancel")) {
    menuItems.push({
      key: "organizer_cancel",
      label: "주최측 취소",
      danger: true,
      onClick: () => void runBulk("organizer_cancel"),
    });
  }
  if (canRunAction(row, "mark_gym_cancelled")) {
    menuItems.push({
      key: "mark_gym_cancelled",
      label: "체육관취소 처리",
      danger: true,
      onClick: () => void runBulk("mark_gym_cancelled"),
    });
  }
  if (canRestoreOrganizer) {
    menuItems.push({
      key: "restore_organizer",
      label: "취소 복구",
      onClick: () => void runRestore("organizer"),
    });
  }
  if (canRestoreGym) {
    menuItems.push({
      key: "restore_gym",
      label: "체육관취소 복구",
      onClick: () => void runRestore("gym"),
    });
  }
  if (canPermanentDelete) {
    menuItems.push({
      key: "delete",
      label: "영구 삭제",
      danger: true,
      onClick: () => void runPermanentDelete(),
    });
  }

  const btnSize = touchFriendly ? "field" : "sm";
  const btnClass = touchFriendly ? "w-full sm:w-auto" : "h-7 px-2 text-xs";

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        compact ? "items-center" : "items-stretch sm:items-end",
      )}
    >
      {showResolve ? (
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
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5",
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
            onClick={() => void runBulk(action)}
          >
            {ACTION_LABELS[action]}
          </Button>
        ))}

        {manualRegistrationOptions ? (
          <Button
            type="button"
            size={btnSize}
            variant="outline"
            className={btnClass}
            disabled={pending}
            onClick={() => setEditOpen(true)}
          >
            수정
          </Button>
        ) : null}

        {menuItems.length > 0 ? (
          <div className="relative" ref={menuRef}>
            <Button
              type="button"
              size={btnSize}
              variant="outline"
              className={cn(btnClass, "min-w-7 px-2")}
              disabled={pending}
              aria-label="더보기"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋯
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 z-30 mt-1 min-w-[10rem] rounded-md border bg-popover p-1 shadow-md">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={cn(
                      "block w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted",
                      item.danger && "text-destructive",
                    )}
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : primaryActions.length === 0 && !showResolve ? (
          <span className="text-muted-foreground text-xs">{statusLabel}</span>
        ) : null}
      </div>

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

      {manualRegistrationOptions && editOpen ? (
        <OrganizerApplicationEditPanel
          open={editOpen}
          onOpenChange={setEditOpen}
          eventId={eventId}
          applicationId={row.applicationId}
          options={manualRegistrationOptions}
        />
      ) : null}
    </div>
  );
}
