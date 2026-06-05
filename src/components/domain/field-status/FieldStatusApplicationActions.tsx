"use client";

import {
  checkInActionFormActionVoid,
  markDisqualifiedFormActionVoid,
  markNoShowFormActionVoid,
  markWithdrawnFormActionVoid,
  recordWeighInWeightFormActionVoid,
  saveFieldMemoFormActionVoid,
  weighInFailFormActionVoid,
  weighInManualFailFormActionVoid,
  weighInManualPassFormActionVoid,
  weighInPassFormActionVoid,
} from "@/features/field-status/actions";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { cn } from "@/lib/utils";

function ActionButton({
  label,
  variant = "outline",
  formAction,
  applicationId,
  confirmMessage,
}: {
  label: string;
  variant?: "outline" | "secondary" | "destructive" | "default";
  formAction: (formData: FormData) => Promise<void>;
  applicationId: string;
  confirmMessage?: string;
}) {
  return (
    <form
      action={async (formData) => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        await formAction(formData);
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <Button type="submit" size="sm" variant={variant} className="h-7 text-xs">
        {label}
      </Button>
    </form>
  );
}

export function FieldStatusRowActions({ row }: { row: FieldStatusRowDTO }) {
  return (
    <div className="flex min-w-[11rem] flex-wrap gap-1">
      <ActionButton
        label="현장 확인"
        variant="default"
        formAction={checkInActionFormActionVoid}
        applicationId={row.applicationId}
      />
      <ActionButton
        label="미출석"
        formAction={markNoShowFormActionVoid}
        applicationId={row.applicationId}
        confirmMessage={`${row.fighterName} 선수를 미출석 처리할까요?`}
      />
      <ActionButton
        label="철회"
        formAction={markWithdrawnFormActionVoid}
        applicationId={row.applicationId}
        confirmMessage={`${row.fighterName} 선수를 철회 처리할까요?`}
      />
      <ActionButton
        label="실격"
        variant="destructive"
        formAction={markDisqualifiedFormActionVoid}
        applicationId={row.applicationId}
        confirmMessage={`${row.fighterName} 선수를 실격 처리할까요?`}
      />
      <ActionButton
        label="계체 통과"
        formAction={weighInPassFormActionVoid}
        applicationId={row.applicationId}
      />
      <ActionButton
        label="계체 실패"
        variant="destructive"
        formAction={weighInFailFormActionVoid}
        applicationId={row.applicationId}
      />
      <ActionButton
        label="수동 승인"
        formAction={weighInManualPassFormActionVoid}
        applicationId={row.applicationId}
      />
      <ActionButton
        label="수동 실패"
        variant="destructive"
        formAction={weighInManualFailFormActionVoid}
        applicationId={row.applicationId}
      />
    </div>
  );
}

export function WeighInWeightForm({ row }: { row: FieldStatusRowDTO }) {
  return (
    <form
      action={recordWeighInWeightFormActionVoid}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="applicationId" value={row.applicationId} />
      <input
        name="weightKg"
        type="number"
        step="0.1"
        min="0"
        placeholder="kg"
        defaultValue={row.weighInWeightKg ?? ""}
        className={cn(
          "border-input bg-background h-8 w-20 rounded-md border px-2 text-xs",
        )}
      />
      <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
        입력
      </Button>
    </form>
  );
}

export function FieldMemoForm({ row }: { row: FieldStatusRowDTO }) {
  return (
    <form action={saveFieldMemoFormActionVoid} className="flex flex-col gap-1">
      <input type="hidden" name="applicationId" value={row.applicationId} />
      <textarea
        name="memo"
        rows={2}
        defaultValue={row.fieldMemo ?? ""}
        placeholder="현장 메모"
        className={cn(
          "border-input bg-background min-h-[2.5rem] w-full min-w-[10rem] rounded-md border px-2 py-1 text-xs",
        )}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="h-7 self-start text-xs"
      >
        메모 저장
      </Button>
    </form>
  );
}
