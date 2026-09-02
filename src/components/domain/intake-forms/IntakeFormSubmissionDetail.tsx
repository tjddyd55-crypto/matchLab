"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPublicDateTime } from "@/lib/date-display";
import { formatIntakeAnswerForDisplay } from "@/lib/intake-form/fields";
import {
  INTAKE_FORM_SUBMISSION_STATUS_LABEL,
} from "@/lib/intake-form/ui-labels";
import { updateIntakeFormSubmissionStatusAction } from "@/features/intake-forms/actions";
import type { IntakeFormFieldType, IntakeFormSubmissionStatus } from "@/generated/prisma";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export function IntakeFormSubmissionDetail({
  formId,
  submission,
}: {
  formId: string;
  submission: {
    id: string;
    status: IntakeFormSubmissionStatus;
    submittedAt: Date;
    adminMemo: string | null;
    answers: Array<{
      fieldLabelSnapshot: string;
      fieldTypeSnapshot: IntakeFormFieldType;
      valueJson: unknown;
    }>;
  };
}) {
  const router = useRouter();
  const [status, setStatus] = useState(submission.status);
  const [adminMemo, setAdminMemo] = useState(submission.adminMemo ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateIntakeFormSubmissionStatusAction(
        formId,
        submission.id,
        { status, adminMemo: adminMemo.trim() || null },
      );
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-xl border border-matchon-border bg-white p-5">
      <div className="text-sm text-matchon-text-secondary">
        신청일 {formatPublicDateTime(submission.submittedAt.toISOString())}
      </div>
      <dl className="space-y-4">
        {submission.answers.map((a) => (
          <div key={`${a.fieldLabelSnapshot}-${a.fieldTypeSnapshot}`}>
            <dt className="text-xs font-semibold text-matchon-text-secondary">
              {a.fieldLabelSnapshot}
            </dt>
            <dd className="mt-1 text-sm text-matchon-text-primary">
              {formatIntakeAnswerForDisplay(a.fieldTypeSnapshot, a.valueJson) ||
                "—"}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-3 border-t border-matchon-border pt-4">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">상태</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as IntakeFormSubmissionStatus)
            }
            className={matchonFieldInputClass}
          >
            {(Object.keys(INTAKE_FORM_SUBMISSION_STATUS_LABEL) as IntakeFormSubmissionStatus[]).map(
              (k) => (
                <option key={k} value={k}>
                  {INTAKE_FORM_SUBMISSION_STATUS_LABEL[k]}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">관리자 메모</span>
          <textarea
            value={adminMemo}
            onChange={(e) => setAdminMemo(e.target.value)}
            rows={3}
            className={matchonFieldInputClass}
          />
        </label>
        {message ? <p className="text-destructive text-sm">{message}</p> : null}
        <Button type="button" disabled={pending} onClick={save}>
          저장
        </Button>
      </div>
    </div>
  );
}
