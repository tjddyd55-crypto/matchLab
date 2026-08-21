"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  requestAdditionalInfoAction,
  resendAdditionalInfoAction,
  updateApplicantContactForAdditionalInfoAction,
} from "@/features/additional-info/actions";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formControlFieldClass,
  formControlLabelClass,
} from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";

export function OrganizerAdditionalInfoRowActions({
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
  const [contactOpen, setContactOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const status = row.additionalInfoStatus;
  const isResend = status === "REQUESTED" || status === "IN_PROGRESS";
  const canView =
    status === "COMPLETED" ||
    status === "IN_PROGRESS" ||
    status === "REQUESTED";
  const needsGuardian = row.additionalInfoContactCode === "MISSING_GUARDIAN_PHONE";

  function runRequest() {
    if (row.contactMissing) {
      setContactOpen(true);
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = isResend
        ? await resendAdditionalInfoAction(row.applicationId, eventId)
        : await requestAdditionalInfoAction(row.applicationId, eventId);
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      if (!res.data.ok) {
        if (res.data.contactMissing) {
          setContactOpen(true);
          return;
        }
        setFeedback({ tone: "error", message: res.data.message });
        return;
      }
      setFeedback({ tone: "success", message: res.data.message });
      router.refresh();
    });
  }

  function saveContactAndRetry() {
    setFeedback(null);
    startTransition(async () => {
      const save = await updateApplicantContactForAdditionalInfoAction({
        applicationId: row.applicationId,
        eventId,
        phone: needsGuardian ? undefined : phone,
        guardianPhone: needsGuardian ? guardianPhone : undefined,
      });
      if (!save.ok) {
        setFeedback({ tone: "error", message: save.error.message });
        return;
      }
      setContactOpen(false);
      const res = await requestAdditionalInfoAction(row.applicationId, eventId);
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      if (!res.data.ok) {
        setFeedback({ tone: "error", message: res.data.message });
        if (res.data.contactMissing) setContactOpen(true);
        return;
      }
      setFeedback({ tone: "success", message: res.data.message });
      router.refresh();
    });
  }

  const btnClass = compact ? "h-7 px-2 text-xs" : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        compact ? "items-center" : "items-stretch",
      )}
    >
      {status === "COMPLETED" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={btnClass}
          onClick={() => setViewOpen(true)}
        >
          보기
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          className={btnClass}
          disabled={pending}
          onClick={runRequest}
        >
          {isResend ? "재전송" : "요청"}
        </Button>
      )}

      {canView && status !== "COMPLETED" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btnClass}
          onClick={() => setViewOpen(true)}
        >
          보기
        </Button>
      ) : null}

      {feedback ? (
        <FeedbackMessage tone={feedback.tone} role="status">
          {feedback.message}
        </FeedbackMessage>
      ) : null}

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {needsGuardian
                ? "보호자 연락처를 입력해주세요"
                : "선수 연락처를 입력해주세요"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {needsGuardian
              ? "미성년 선수의 추가정보 요청은 보호자에게 발송됩니다."
              : "추가정보 요청을 보내려면 선수 연락처가 필요합니다."}
          </p>
          <div className="space-y-3 py-1">
            {needsGuardian ? (
              <div className="space-y-1.5">
                <label className={formControlLabelClass} htmlFor="ai-guardian-phone">
                  보호자 연락처 *
                </label>
                <input
                  id="ai-guardian-phone"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="01012345678"
                  className={formControlFieldClass}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className={formControlLabelClass} htmlFor="ai-athlete-phone">
                  선수 연락처 *
                </label>
                <input
                  id="ai-athlete-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className={formControlFieldClass}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setContactOpen(false)}
            >
              취소
            </Button>
            <Button type="button" disabled={pending} onClick={saveContactAndRetry}>
              저장 후 요청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>추가정보 현황</DialogTitle>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">선수</dt>
              <dd>{row.fighterName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">상태</dt>
              <dd>{row.additionalInfoLabel}</dd>
            </div>
            {row.insuranceRrnMasked ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">주민번호</dt>
                <dd>{row.insuranceRrnMasked}</dd>
              </div>
            ) : null}
            {row.additionalInfoCompletedAt ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">완료일시</dt>
                <dd>{row.additionalInfoCompletedAt}</dd>
              </div>
            ) : null}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
