"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
}: {
  submissionId: string;
  status: FighterRegistrationSubmissionStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const canAct =
    status === "submitted" || status === "duplicate_review";

  if (!canAct) {
    return (
      <span className="text-muted-foreground text-xs text-right">처리 완료</span>
    );
  }

  function showFailure(message: string) {
    setActionError(message);
    window.alert(message);
  }

  function run(fn: (fd: FormData) => Promise<ActionResult<unknown>>) {
    startTransition(async () => {
      setActionError(null);
      const fd = new FormData();
      fd.set("submissionId", submissionId);
      const res = await fn(fd);
      if (!res.ok) {
        const msg =
          res.error.message?.trim() ||
          "처리 중 오류가 발생했습니다.";
        console.error("[registration request]", res.error.code, msg);
        showFailure(msg);
        return;
      }
      setActionError(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
      {actionError ? (
        <p
          className="text-destructive max-w-[240px] text-right text-xs leading-relaxed"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
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
    </div>
  );
}
