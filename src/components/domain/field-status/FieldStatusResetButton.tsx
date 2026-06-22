"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetFieldStatusInputFormAction } from "@/features/field-status/actions";
import { Button } from "@/components/ui/button";
import { canResetFieldStatusInput } from "@/lib/field-final-result";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export function FieldStatusResetButton({ row }: { row: FieldStatusRowDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      const res = await resetFieldStatusInputFormAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex w-fit flex-col items-start gap-1">
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="h-7 w-fit px-2 text-xs"
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
      {error ? (
        <p className="text-destructive text-[10px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
