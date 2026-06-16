"use client";

import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  checkInActionFormAction,
  markDisqualifiedFormAction,
  markNoShowFormAction,
  markWithdrawnFormAction,
  quickConfirmEligibilityFormAction,
  recordWeighInWeightFormAction,
  saveFieldMemoFormAction,
  weighInFailFormAction,
  weighInManualPassFormAction,
  weighInPassFormAction,
} from "@/features/field-status/actions";
import { FieldStatusBracketPanel } from "@/components/domain/field-status/FieldStatusBracketPanel";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { cn } from "@/lib/utils";

type SaveFeedback = {
  kind: "success" | "error" | "pending";
  message: string;
} | null;

function useSaveFeedback(timeoutMs = 2500) {
  const [feedback, setFeedback] = useState<SaveFeedback>(null);

  useEffect(() => {
    if (!feedback || feedback.kind === "pending") return;
    const t = window.setTimeout(() => setFeedback(null), timeoutMs);
    return () => window.clearTimeout(t);
  }, [feedback, timeoutMs]);

  return { feedback, setFeedback };
}

function SaveFeedbackLine({ feedback }: { feedback: SaveFeedback }) {
  if (!feedback) return null;
  return (
    <p
      className={cn(
        "text-xs",
        feedback.kind === "success" && "text-emerald-700 dark:text-emerald-300",
        feedback.kind === "error" && "text-destructive",
        feedback.kind === "pending" && "text-muted-foreground",
      )}
      role="status"
    >
      {feedback.message}
    </p>
  );
}

function ActionGroup({
  title,
  children,
  className,
  inline = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1", className)}>
        <span className="text-muted-foreground mr-0.5 text-[10px] font-medium">
          {title}
        </span>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-muted-foreground text-[11px] font-medium">{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function ActionButton({
  label,
  variant = "outline",
  onClick,
  disabled,
  confirmMessage,
}: {
  label: string;
  variant?: "outline" | "secondary" | "destructive" | "default";
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={disabled || pending}
      className="h-7 text-xs"
      onClick={() => {
        startTransition(async () => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          await onClick();
        });
      }}
    >
      {pending ? "처리 중…" : label}
    </Button>
  );
}

async function runAction(
  applicationId: string,
  action: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>,
): Promise<void> {
  const fd = new FormData();
  fd.set("applicationId", applicationId);
  const result = await action(fd);
  if (!result.ok) {
    window.alert(result.error?.message ?? "처리에 실패했습니다.");
  }
}

export function FieldStatusRowActions({
  row,
  layout = "stack",
}: {
  row: FieldStatusRowDTO;
  layout?: "stack" | "compact";
}) {
  const id = row.applicationId;
  const name = row.fighterName;
  const inline = layout === "compact";

  return (
    <div
      className={cn(
        inline
          ? "flex flex-wrap items-center gap-x-3 gap-y-1.5"
          : "flex min-w-[12rem] flex-col gap-2",
      )}
    >
      <ActionGroup title="현장" inline={inline}>
        <ActionButton
          label="현장 확인"
          variant="default"
          onClick={() => runAction(id, checkInActionFormAction)}
        />
        <ActionButton
          label="미출석"
          onClick={() => runAction(id, markNoShowFormAction)}
          confirmMessage={`${name} 선수를 미출석 처리할까요?`}
        />
        <ActionButton
          label="철회"
          onClick={() => runAction(id, markWithdrawnFormAction)}
          confirmMessage={`${name} 선수를 철회 처리할까요?`}
        />
        <ActionButton
          label="실격"
          variant="destructive"
          onClick={() => runAction(id, markDisqualifiedFormAction)}
          confirmMessage={`${name} 선수를 실격 처리할까요?`}
        />
      </ActionGroup>

      <ActionGroup title="계체" inline={inline}>
        <ActionButton
          label="계체 통과"
          onClick={() => runAction(id, weighInPassFormAction)}
        />
        <ActionButton
          label="계체 실패"
          variant="destructive"
          onClick={() => runAction(id, weighInFailFormAction)}
        />
        <ActionButton
          label="수동 승인"
          onClick={() => runAction(id, weighInManualPassFormAction)}
        />
      </ActionGroup>

      <ActionGroup title="출전" inline={inline}>
        <ActionButton
          label="출전 확정"
          variant="secondary"
          disabled={row.isEligibleForBracket}
          onClick={() => runAction(id, quickConfirmEligibilityFormAction)}
          confirmMessage={
            row.isEligibleForBracket
              ? undefined
              : `${name} 선수를 현장 확인·계체 통과 상태로 출전 확정할까요?`
          }
        />
      </ActionGroup>

      <ActionGroup title="대진" inline={inline}>
        <FieldStatusBracketPanel row={row} compact />
      </ActionGroup>
    </div>
  );
}

export function WeighInWeightInput({ row }: { row: FieldStatusRowDTO }) {
  const router = useRouter();
  const [weightInput, setWeightInput] = useState(
    row.weighInWeightKg != null ? String(row.weighInWeightKg) : "",
  );
  const [savedKg, setSavedKg] = useState<number | null>(row.weighInWeightKg);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsedInput = weightInput.trim() ? Number(weightInput) : null;
  const isSaved =
    savedKg != null &&
    parsedInput != null &&
    Number.isFinite(parsedInput) &&
    Math.abs(parsedInput - savedKg) < 0.05;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const weightKg = weightInput.trim();
    if (!weightKg) return;
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("weightKg", weightKg);
      const result = await recordWeighInWeightFormAction(fd);
      if (result.ok) {
        const kg = Number(weightKg);
        setSavedKg(kg);
        router.refresh();
      } else {
        setErrorMessage(result.error.message || "저장 실패. 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div className="space-y-1">
      <form onSubmit={handleSubmit} className="flex items-center gap-1">
        <input
          name="weightKg"
          type="number"
          step="0.1"
          min="0"
          placeholder="kg"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          className="border-input bg-background h-7 w-16 rounded-md border px-2 text-xs"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          className="h-7 shrink-0 px-2 text-xs"
          disabled={pending}
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
      </form>
      {isSaved ? (
        <p
          className="text-xs font-medium text-emerald-700 dark:text-emerald-300"
          role="status"
        >
          저장됨 · {savedKg}kg
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-destructive text-xs" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated 목록에서는 WeighInWeightInput + WeighInStatusBadge 분리 사용 */
export function WeighInWeightForm({ row }: { row: FieldStatusRowDTO }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <WeighInWeightInput row={row} />
        <WeighInStatusBadge status={row.weighInStatus} />
      </div>
    </div>
  );
}

export function FieldMemoForm({ row }: { row: FieldStatusRowDTO }) {
  const { feedback, setFeedback } = useSaveFeedback();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const memo = (form.elements.namedItem("memo") as HTMLTextAreaElement).value;
    setFeedback({ kind: "pending", message: "저장 중..." });

    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("memo", memo);
      const result = await saveFieldMemoFormAction(fd);
      if (result.ok) {
        setFeedback({ kind: "success", message: "메모 저장됨" });
      } else {
        setFeedback({
          kind: "error",
          message: result.error.message || "저장 실패. 다시 시도해 주세요.",
        });
      }
    });
  }

  return (
    <div className="space-y-0.5">
      <form onSubmit={handleSubmit} className="flex items-start gap-1">
        <textarea
          name="memo"
          rows={1}
          defaultValue={row.fieldMemo ?? ""}
          placeholder="현장 메모"
          className="border-input bg-background min-h-[1.75rem] min-w-0 flex-1 resize-y rounded-md border px-2 py-1 text-xs"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2 text-xs"
          disabled={pending}
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
      </form>
      <SaveFeedbackLine feedback={feedback} />
    </div>
  );
}
