"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetFieldStatusInputFormAction } from "@/features/field-status/actions";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { canResetFieldStatusInput } from "@/lib/field-final-result";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { cn } from "@/lib/utils";

export function FieldStatusResetButton({
  row,
  touchFriendly = false,
}: {
  row: FieldStatusRowDTO;
  touchFriendly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const canReset = canResetFieldStatusInput(row);

  function handleReset() {
    if (!canReset) {
      return;
    }

    if (
      !window.confirm(
        "이 선수의 계체/결과입력 내용을 초기화하시겠습니까?",
      )
    ) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      const res = await resetFieldStatusInputFormAction(fd);
      if (!res.ok) {
        const message = res.error.message;
        setFeedback({ tone: "error", message });
        window.alert(message);
        return;
      }
      setFeedback({ tone: "success", message: "계체·결과 입력이 초기화되었습니다." });
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <Button
        type="button"
        size={touchFriendly ? "field" : "xs"}
        variant="outline"
        className={cn(
          touchFriendly ? "w-full sm:w-fit" : "h-8 w-fit px-2 text-xs",
        )}
        disabled={pending || !canReset}
        onClick={handleReset}
        title={
          !canReset
            ? "초기화할 계체·현장 입력이 없습니다."
            : undefined
        }
      >
        {pending ? "초기화 중…" : "초기화"}
      </Button>
      {feedback ? (
        <FeedbackMessage tone={feedback.tone}>{feedback.message}</FeedbackMessage>
      ) : null}
    </div>
  );
}
