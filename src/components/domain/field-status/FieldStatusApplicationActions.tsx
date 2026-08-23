"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
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
  weighInPassFormAction,
} from "@/features/field-status/actions";
import { FieldStatusBracketPanel } from "@/components/domain/field-status/FieldStatusBracketPanel";
import { WeighInStatusBadge } from "@/components/domain/field-status/WeighInStatusBadge";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { cn } from "@/lib/utils";

function formatSavedWeightKg(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

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
  if (feedback.kind === "pending") {
    return (
      <p className="text-muted-foreground text-xs" role="status">
        {feedback.message}
      </p>
    );
  }
  return (
    <FeedbackMessage
      tone={feedback.kind === "success" ? "success" : "error"}
      role={feedback.kind === "error" ? "alert" : "status"}
    >
      {feedback.message}
    </FeedbackMessage>
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
  confirmDanger = false,
  touchFriendly = false,
}: {
  label: string;
  variant?: "outline" | "secondary" | "destructive" | "default";
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  confirmMessage?: string;
  confirmDanger?: boolean;
  touchFriendly?: boolean;
}) {
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size={touchFriendly ? "field" : "sm"}
      variant={variant}
      disabled={disabled || pending}
      className={touchFriendly ? "w-full sm:w-auto" : "h-7 text-xs"}
      onClick={() => {
        startTransition(async () => {
          if (confirmMessage) {
            const ok = await confirm({
              title: confirmMessage,
              variant: confirmDanger ? "danger" : "default",
            });
            if (!ok) return;
          }
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
  alert: (message: string) => Promise<void>,
): Promise<void> {
  const fd = new FormData();
  fd.set("applicationId", applicationId);
  const result = await action(fd);
  if (!result.ok) {
    await alert(result.error?.message ?? "처리에 실패했습니다.");
  }
}

export function FieldStatusRowActions({
  row,
  layout = "stack",
}: {
  row: FieldStatusRowDTO;
  layout?: "stack" | "compact";
}) {
  const { alert } = useAppConfirmDialog();
  const id = row.applicationId;
  const name = row.fighterName;
  const inline = layout === "compact";
  const run = (
    applicationId: string,
    action: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>,
  ) => runAction(applicationId, action, alert);

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
          onClick={() => run(id, checkInActionFormAction)}
        />
        <ActionButton
          label="미출석"
          onClick={() => run(id, markNoShowFormAction)}
          confirmMessage={`${name} 선수를 미출석 처리할까요?`}
          confirmDanger
        />
        <ActionButton
          label="철회"
          onClick={() => run(id, markWithdrawnFormAction)}
          confirmMessage={`${name} 선수를 철회 처리할까요?`}
          confirmDanger
        />
        <ActionButton
          label="실격"
          variant="destructive"
          onClick={() => run(id, markDisqualifiedFormAction)}
          confirmMessage={`${name} 선수를 실격 처리할까요?`}
          confirmDanger
        />
      </ActionGroup>

      <ActionGroup title="계체" inline={inline}>
        <ActionButton
          label="계체 통과"
          onClick={() => run(id, weighInPassFormAction)}
        />
        <ActionButton
          label="계체 실패"
          variant="destructive"
          onClick={() => run(id, weighInFailFormAction)}
        />
      </ActionGroup>

      <ActionGroup title="출전" inline={inline}>
        <ActionButton
          label="출전 확정"
          variant="secondary"
          disabled={row.isEligibleForBracket}
          onClick={() => run(id, quickConfirmEligibilityFormAction)}
          confirmMessage={
            row.isEligibleForBracket
              ? undefined
              : `${name} 선수를 계체 통과 상태로 출전 확정할까요?`
          }
        />
      </ActionGroup>

      <ActionGroup title="대진" inline={inline}>
        <FieldStatusBracketPanel row={row} compact />
      </ActionGroup>
    </div>
  );
}

export function WeighInWeightInput({
  row,
  touchFriendly = false,
}: {
  row: FieldStatusRowDTO;
  touchFriendly?: boolean;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
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
    <div className="flex w-full min-w-0 flex-col items-start justify-center gap-0.5">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center justify-start gap-1.5",
          touchFriendly && "w-full flex-col sm:flex-row",
        )}
      >
        <input
          name="weightKg"
          type="number"
          step="0.1"
          min="0"
          placeholder="kg"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          className={cn(
            "border-input bg-background shrink-0 rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            touchFriendly ? "h-11 w-full text-sm sm:w-[5.5rem]" : "h-8 w-[4.25rem]",
          )}
        />
        <Button
          type="submit"
          size={touchFriendly ? "field" : "sm"}
          variant="default"
          className={cn(
            "shrink-0",
            touchFriendly ? "w-full sm:w-auto" : "h-8 min-w-[2.75rem] px-2 text-xs",
          )}
          disabled={pending}
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
      </form>
      {hydrated && isSaved && savedKg != null ? (
        <p className="text-[11px] font-medium text-emerald-600" role="status">
          저장됨 {formatSavedWeightKg(savedKg)}kg
        </p>
      ) : null}
      {errorMessage ? (
        <FeedbackMessage tone="error" role="alert">
          {errorMessage}
        </FeedbackMessage>
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
  const [memo, setMemo] = useState(row.fieldMemo ?? "");

  useEffect(() => {
    setMemo(row.fieldMemo ?? "");
  }, [row.applicationId, row.fieldMemo]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback({ kind: "pending", message: "저장 중..." });

    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("memo", memo.trim());
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
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          name="memo"
          rows={2}
          maxLength={500}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="참가자에 대한 운영 메모를 입력하세요."
          className="border-input bg-background max-h-[120px] min-h-[3.5rem] w-full resize-y rounded-md border px-2.5 py-2 text-xs"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-[10px] tabular-nums">
            주최자 내부용 · {memo.length}/500
          </p>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 px-3 text-xs"
            disabled={pending}
          >
            {pending ? "저장 중…" : "메모 저장"}
          </Button>
        </div>
      </form>
      <SaveFeedbackLine feedback={feedback} />
    </div>
  );
}
