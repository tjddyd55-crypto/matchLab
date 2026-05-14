"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  approveRegistrationSubmissionAction,
  rejectRegistrationSubmissionAction,
} from "@/features/registrations/actions";
import { Button } from "@/components/ui/button";
import type { FighterRegistrationSubmissionStatus } from "@/lib/enums";

import type { ActionResult } from "@/lib/action-result";

export function RegistrationRequestActions({
  submissionId,
  status,
  consentCopyAbsoluteUrl,
  approvalBlockedByConsent,
}: {
  submissionId: string;
  status: FighterRegistrationSubmissionStatus;
  consentCopyAbsoluteUrl: string | null;
  approvalBlockedByConsent: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const canAct =
    status === "submitted" || status === "duplicate_review";

  if (!canAct) {
    return (
      <span className="text-muted-foreground text-xs text-right">처리 완료</span>
    );
  }

  function run(fn: (fd: FormData) => Promise<ActionResult<unknown>>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("submissionId", submissionId);
      const res = await fn(fd);
      if (!res.ok) {
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  async function copyConsentLink() {
    if (!consentCopyAbsoluteUrl) return;
    try {
      await navigator.clipboard.writeText(consentCopyAbsoluteUrl);
      window.alert("동의 링크가 클립보드에 복사되었습니다.");
    } catch {
      window.alert(
        "복사에 실패했습니다. 브라우저에서 클립보드 권한을 확인해 주세요.",
      );
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
      {consentCopyAbsoluteUrl ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => void copyConsentLink()}
        >
          동의 링크 복사
        </Button>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || approvalBlockedByConsent}
          title={
            approvalBlockedByConsent
              ? "보호자 동의가 완료된 후 승인할 수 있습니다."
              : undefined
          }
          onClick={() => void run(approveRegistrationSubmissionAction)}
        >
          승인
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void run(rejectRegistrationSubmissionAction)}
        >
          반려
        </Button>
      </div>
      {approvalBlockedByConsent ? (
        <p className="text-amber-700 max-w-[220px] text-right text-xs dark:text-amber-400">
          동의 미완료 시 승인할 수 없습니다.
        </p>
      ) : null}
    </div>
  );
}
