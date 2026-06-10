"use client";

import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
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
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
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

export function FieldStatusRowActions({ row }: { row: FieldStatusRowDTO }) {
  const id = row.applicationId;
  const name = row.fighterName;

  return (
    <div className="flex min-w-[12rem] flex-col gap-2">
      <ActionGroup title="현장">
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

      <ActionGroup title="계체">
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

      <ActionGroup title="출전">
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

      <ActionGroup title="대진 처리">
        <FieldStatusBracketPanel row={row} compact />
      </ActionGroup>
    </div>
  );
}

export function WeighInWeightForm({ row }: { row: FieldStatusRowDTO }) {
  const { feedback, setFeedback } = useSaveFeedback();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const weightKg = (form.elements.namedItem("weightKg") as HTMLInputElement)
      .value;
    setFeedback({ kind: "pending", message: "저장 중..." });

    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("weightKg", weightKg);
      const result = await recordWeighInWeightFormAction(fd);
      if (result.ok) {
        setFeedback({
          kind: "success",
          message: `${weightKg}kg 저장됨`,
        });
      } else {
        setFeedback({
          kind: "error",
          message: result.error.message || "저장 실패. 다시 시도해 주세요.",
        });
      }
    });
  }

  return (
    <div className="space-y-1">
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-1">
        <input
          name="weightKg"
          type="number"
          step="0.1"
          min="0"
          placeholder="kg"
          defaultValue={row.weighInWeightKg ?? ""}
          className={cn(
            "border-input bg-background h-8 min-w-0 flex-1 rounded-md border px-2 text-xs md:w-20 md:flex-none",
          )}
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          className="h-8 shrink-0 text-xs"
          disabled={pending}
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
      </form>
      <SaveFeedbackLine feedback={feedback} />
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
    <div className="space-y-1">
      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
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
          disabled={pending}
        >
          {pending ? "저장 중…" : "메모 저장"}
        </Button>
      </form>
      <SaveFeedbackLine feedback={feedback} />
    </div>
  );
}
