"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetFieldStatusInputFormAction } from "@/features/field-status/actions";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export function FieldStatusResetButton({ row }: { row: FieldStatusRowDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasOfficialResult = row.bracketAssignments.some(
    (a) => a.hasOfficialResult,
  );

  function handleReset() {
    if (hasOfficialResult) {
      window.alert(
        "공식 결과가 확정된 경기가 있어 초기화할 수 없습니다.",
      );
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
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={pending || hasOfficialResult}
        onClick={handleReset}
        title={
          hasOfficialResult
            ? "공식 결과 확정 경기가 있어 초기화할 수 없습니다."
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
