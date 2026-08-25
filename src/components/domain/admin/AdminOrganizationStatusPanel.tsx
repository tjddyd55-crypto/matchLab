"use client";

import { useState, useTransition } from "react";
import {
  adminUpdateGymStatusAction,
  adminUpdateOrganizerStatusAction,
} from "@/features/admin-organization/actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GymStatus,
  OrganizerStatus,
} from "@/generated/prisma";
import type { GymStatus as GymStatusType, OrganizerStatus as OrganizerStatusType } from "@/lib/enums";
import {
  getAdminGymStatusLabel,
  getAdminOrganizerStatusLabel,
} from "@/lib/ui/admin-ui";
import { formControlFieldClass } from "@/lib/ui/form-control-ui";

type OrganizationKind = "association" | "gym";

const ASSOCIATION_TRANSITIONS: Partial<
  Record<OrganizerStatus, OrganizerStatus[]>
> = {
  [OrganizerStatus.active]: [OrganizerStatus.suspended],
  [OrganizerStatus.suspended]: [OrganizerStatus.active],
};

const GYM_TRANSITIONS: Partial<Record<GymStatus, GymStatus[]>> = {
  [GymStatus.active]: [GymStatus.suspended],
  [GymStatus.suspended]: [GymStatus.active],
};

function nextStatusOptions(
  kind: OrganizationKind,
  current: OrganizerStatus | GymStatus,
): Array<{ value: string; label: string }> {
  if (kind === "association") {
    const options =
      ASSOCIATION_TRANSITIONS[current as OrganizerStatus] ?? [];
    return options.map((value) => ({
      value,
      label: getAdminOrganizerStatusLabel(value),
    }));
  }
  const options = GYM_TRANSITIONS[current as GymStatus] ?? [];
  return options.map((value) => ({
    value,
    label: getAdminGymStatusLabel(value),
  }));
}

function impactMessage(kind: OrganizationKind, nextStatus: string): string {
  if (nextStatus === OrganizerStatus.suspended || nextStatus === GymStatus.suspended) {
    return kind === "association"
      ? "협회 관리자 포털 이용이 제한됩니다. 신규 대회 생성 등 일반 업무는 차단되며, 이미 진행 중인 대회 현장 운영은 유지됩니다."
      : "체육관 관리자 포털 이용이 제한됩니다. 신규 회원·선수 등록 등 write 작업이 차단됩니다.";
  }
  return "조직 이용이 정상 상태로 복구됩니다.";
}

export function AdminOrganizationStatusPanel({
  kind,
  organizationId,
  organizationName,
  currentStatus,
  statusLabel,
  canManage,
}: {
  kind: OrganizationKind;
  organizationId: string;
  organizationName: string;
  currentStatus: OrganizerStatusType | GymStatusType;
  statusLabel: string;
  canManage: boolean;
}) {
  const { confirm } = useAppConfirmDialog();
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [reason, setReason] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const transitions = nextStatusOptions(kind, currentStatus);
  const selectedNext = nextStatus || transitions[0]?.value || "";

  function resetForm() {
    setNextStatus("");
    setReason("");
    setAdminMemo("");
    setError(null);
  }

  function openDialog() {
    resetForm();
    setOpen(true);
  }

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    resetForm();
  }

  function submit() {
    if (!selectedNext || pending) return;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 2) {
      setError("사유는 2자 이상 입력해 주세요.");
      return;
    }

    const nextLabel =
      kind === "association"
        ? getAdminOrganizerStatusLabel(selectedNext as OrganizerStatus)
        : getAdminGymStatusLabel(selectedNext as GymStatus);

    startTransition(async () => {
      const ok = await confirm({
        title: "운영 상태 변경",
        description: `${organizationName}을(를) 「${statusLabel}」에서 「${nextLabel}」(으)로 변경합니다.`,
        confirmLabel: nextLabel,
        variant:
          selectedNext === OrganizerStatus.suspended ||
          selectedNext === GymStatus.suspended
            ? "danger"
            : "default",
      });
      if (!ok) return;

      setError(null);
      const fd = new FormData();
      fd.set("reason", trimmedReason);
      if (adminMemo.trim()) fd.set("adminMemo", adminMemo.trim());
      fd.set("nextStatus", selectedNext);

      const result =
        kind === "association"
          ? await adminUpdateOrganizerStatusAction(null, (() => {
              const form = new FormData();
              form.set("organizerId", organizationId);
              form.set("nextStatus", selectedNext);
              form.set("reason", trimmedReason);
              if (adminMemo.trim()) form.set("adminMemo", adminMemo.trim());
              return form;
            })())
          : await adminUpdateGymStatusAction(null, (() => {
              const form = new FormData();
              form.set("gymId", organizationId);
              form.set("nextStatus", selectedNext);
              form.set("reason", trimmedReason);
              if (adminMemo.trim()) form.set("adminMemo", adminMemo.trim());
              return form;
            })());

      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setOpen(false);
      resetForm();
    });
  }

  if (!canManage) return null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openDialog}>
        상태 관리
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? openDialog() : closeDialog())}>
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>운영 상태 변경</DialogTitle>
            <DialogDescription>
              {organizationName} · 현재 상태: {statusLabel}
            </DialogDescription>
          </DialogHeader>

          {transitions.length === 0 ? (
            <p className="text-sm text-matchon-text-secondary">
              현재 상태에서는 변경 가능한 운영 상태가 없습니다.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="font-medium">변경할 상태</span>
                <select
                  className={formControlFieldClass}
                  value={selectedNext}
                  disabled={pending}
                  onChange={(e) => setNextStatus(e.target.value)}
                >
                  {transitions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="font-medium">사유 *</span>
                <textarea
                  className={`${formControlFieldClass} min-h-20`}
                  value={reason}
                  disabled={pending}
                  placeholder="요금 미납, 운영 정책 위반, 관리자 요청 등"
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <span className="font-medium">관리자 메모 (선택)</span>
                <textarea
                  className={`${formControlFieldClass} min-h-14`}
                  value={adminMemo}
                  disabled={pending}
                  onChange={(e) => setAdminMemo(e.target.value)}
                />
              </label>

              <p className="text-matchon-text-secondary">
                영향: {impactMessage(kind, selectedNext)}
              </p>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={closeDialog}
            >
              취소
            </Button>
            {transitions.length > 0 ? (
              <Button type="button" disabled={pending} onClick={submit}>
                {pending ? "처리 중…" : transitions.find((t) => t.value === selectedNext)?.label ?? "변경"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
