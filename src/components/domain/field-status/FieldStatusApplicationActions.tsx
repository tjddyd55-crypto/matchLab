"use client";

import type { ReactNode } from "react";
import {
  checkInActionFormActionVoid,
  markDisqualifiedFormActionVoid,
  markNoShowFormActionVoid,
  markWithdrawnFormActionVoid,
  quickConfirmEligibilityFormActionVoid,
  recordWeighInWeightFormActionVoid,
  saveFieldMemoFormActionVoid,
  weighInFailFormActionVoid,
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
  disabled,
  title,
  className,
}: {
  label: string;
  variant?: "outline" | "secondary" | "destructive" | "default";
  formAction: (formData: FormData) => Promise<void>;
  applicationId: string;
  confirmMessage?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <form
      action={async (formData) => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        await formAction(formData);
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <Button
        type="submit"
        size="sm"
        variant={variant}
        disabled={disabled}
        title={title}
        className={cn("h-8 text-xs", className)}
      >
        {label}
      </Button>
    </form>
  );
}

function ActionGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">{children}</div>
    </div>
  );
}

export function FieldStatusQuickActions({ row }: { row: FieldStatusRowDTO }) {
  const canQuickConfirm =
    row.checkInStatus === "pending" ||
    (row.checkInStatus === "checked_in" && row.weighInStatus === "pending");

  return (
    <div className="flex min-w-[14rem] flex-col gap-3">
      <ActionGroup title="현장 확인">
        <ActionButton
          label="현장 확인"
          variant="default"
          formAction={checkInActionFormActionVoid}
          applicationId={row.applicationId}
          className="col-span-2 sm:col-span-1"
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
      </ActionGroup>

      <ActionGroup title="계체">
        <WeighInWeightForm row={row} />
        <ActionButton
          label="계체 통과"
          variant="default"
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
      </ActionGroup>

      <ActionGroup title="출전">
        <ActionButton
          label={row.isEligibleForBracket ? "출전 확정됨" : "출전 확정"}
          variant="default"
          formAction={quickConfirmEligibilityFormActionVoid}
          applicationId={row.applicationId}
          disabled={row.isEligibleForBracket || !canQuickConfirm}
          title={
            row.isEligibleForBracket
              ? row.eligibilityReason
              : canQuickConfirm
                ? "현장 확인 후 계체 통과까지 한 번에 처리합니다."
                : "현장 확인·계체 상태를 먼저 확인해 주세요."
          }
          className="col-span-2"
        />
      </ActionGroup>
    </div>
  );
}

/** @deprecated FieldStatusQuickActions 사용 */
export function FieldStatusRowActions({ row }: { row: FieldStatusRowDTO }) {
  return <FieldStatusQuickActions row={row} />;
}

export function WeighInWeightForm({ row }: { row: FieldStatusRowDTO }) {
  return (
    <form
      action={recordWeighInWeightFormActionVoid}
      className="col-span-2 flex w-full items-center gap-1.5 sm:col-span-1 sm:w-auto"
    >
      <input type="hidden" name="applicationId" value={row.applicationId} />
      <input
        name="weightKg"
        type="number"
        step="0.1"
        min="0"
        placeholder="몸무게(kg)"
        defaultValue={row.weighInWeightKg ?? ""}
        className={cn(
          "border-input bg-background h-8 min-w-0 flex-1 rounded-md border px-2 text-xs sm:w-24 sm:flex-none",
        )}
      />
      <Button type="submit" size="sm" variant="secondary" className="h-8 shrink-0 text-xs">
        입력
      </Button>
    </form>
  );
}

export function FieldMemoForm({
  row,
  compact,
}: {
  row: FieldStatusRowDTO;
  compact?: boolean;
}) {
  return (
    <form
      action={saveFieldMemoFormActionVoid}
      className={cn("flex flex-col gap-1", compact ? "w-full" : "min-w-[10rem]")}
    >
      <input type="hidden" name="applicationId" value={row.applicationId} />
      <textarea
        name="memo"
        rows={compact ? 2 : 2}
        defaultValue={row.fieldMemo ?? ""}
        placeholder="현장 메모"
        className={cn(
          "border-input bg-background min-h-[2.5rem] w-full rounded-md border px-2 py-1 text-xs",
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
