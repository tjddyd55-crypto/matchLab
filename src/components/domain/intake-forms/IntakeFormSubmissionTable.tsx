"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatPublicDate } from "@/lib/date-display";
import { formatIntakeAnswerForDisplay } from "@/lib/intake-form/fields";
import {
  INTAKE_FORM_SUBMISSION_STATUS_LABEL,
} from "@/lib/intake-form/ui-labels";
import { downloadBase64Xlsx } from "@/lib/excel-export/download-client";
import type { IntakeFormSubmissionStatus } from "@/generated/prisma";

type SubmissionRow = {
  id: string;
  status: IntakeFormSubmissionStatus;
  submittedAt: Date;
  answers: Array<{
    fieldLabelSnapshot: string;
    fieldTypeSnapshot: string;
    valueJson: unknown;
  }>;
};

type PreviewField = {
  stableKey: string;
  label: string;
  type: string;
};

export function IntakeFormSubmissionTable({
  formId,
  submissions,
  previewFields,
  exportAction,
}: {
  formId: string;
  submissions: SubmissionRow[];
  previewFields: PreviewField[];
  exportAction: (
    formId: string,
  ) => Promise<{
    ok: boolean;
    data?: { base64: string; filename: string };
    error?: { message: string };
  }>;
}) {
  const [pending, startTransition] = useTransition();

  function exportExcel() {
    startTransition(async () => {
      const result = await exportAction(formId);
      if (result.ok && result.data) {
        downloadBase64Xlsx(result.data.base64, result.data.filename);
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={exportExcel}
        >
          신청자 엑셀 다운로드
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-matchon-border bg-white">
        {submissions.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-matchon-text-secondary">
            아직 신청이 없습니다.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-matchon-border bg-matchon-surface">
              <tr>
                <th className="px-4 py-3 font-semibold">신청일</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                {previewFields.map((f) => (
                  <th key={f.stableKey} className="hidden px-4 py-3 font-semibold md:table-cell">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">상세</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const answerMap = new Map(
                  sub.answers.map((a) => [a.fieldLabelSnapshot, a]),
                );
                return (
                  <tr key={sub.id} className="border-b border-matchon-border last:border-0">
                    <td className="px-4 py-3">
                      {formatPublicDate(sub.submittedAt.toISOString())}
                    </td>
                    <td className="px-4 py-3">
                      {INTAKE_FORM_SUBMISSION_STATUS_LABEL[sub.status]}
                    </td>
                    {previewFields.map((f) => {
                      const a = answerMap.get(f.label);
                      return (
                        <td key={f.stableKey} className="hidden max-w-[120px] truncate px-4 py-3 md:table-cell">
                          {a
                            ? formatIntakeAnswerForDisplay(
                                f.type as import("@/generated/prisma").IntakeFormFieldType,
                                a.valueJson,
                              )
                            : "—"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <Link
                        href={`/organizer/intake-forms/${formId}/submissions/${sub.id}`}
                        className="text-matchon-primary hover:underline"
                      >
                        보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
