"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markDisqualifiedFormAction,
  weighInFailFormAction,
  weighInManualPassFormAction,
  weighInPassFormAction,
} from "@/features/field-status/actions";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export function FieldStatusPrimaryActions({
  row,
  showDisqualify = true,
}: {
  row: FieldStatusRowDTO;
  /** 상세 workflow에서는 실격을 사유 구역으로 분리 */
  showDisqualify?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showDisqualifyHint, setShowDisqualifyHint] = useState(false);

  async function run(
    action: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>,
  ) {
    const fd = new FormData();
    fd.set("applicationId", row.applicationId);
    const res = await action(fd);
    if (!res.ok) {
      window.alert(res.error?.message ?? "처리에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  const isDisqualified = row.checkInStatus === "disqualified";
  const weighIn = row.weighInStatus;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={weighIn === "pass" ? "default" : "outline"}
          className="h-9 text-xs"
          disabled={pending || weighIn === "pass"}
          onClick={() =>
            startTransition(() => run(weighInPassFormAction))
          }
        >
          계체 통과
        </Button>
        <Button
          type="button"
          size="sm"
          variant={
            weighIn === "fail" || weighIn === "manual_fail"
              ? "default"
              : "outline"
          }
          className="h-9 text-xs"
          disabled={
            pending || weighIn === "fail" || weighIn === "manual_fail"
          }
          onClick={() =>
            startTransition(() => run(weighInFailFormAction))
          }
        >
          계체 실패
        </Button>
        <Button
          type="button"
          size="sm"
          variant={weighIn === "manual_pass" ? "default" : "outline"}
          className="h-9 text-xs"
          disabled={pending || weighIn === "manual_pass"}
          onClick={() =>
            startTransition(() => run(weighInManualPassFormAction))
          }
        >
          수동 승인
        </Button>
        {showDisqualify ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-9 text-xs"
            disabled={pending || isDisqualified}
            onClick={() => {
              setShowDisqualifyHint(true);
              startTransition(async () => {
                await run(markDisqualifiedFormAction);
              });
            }}
          >
            실격
          </Button>
        ) : null}
      </div>
      {showDisqualify && showDisqualifyHint && !isDisqualified ? (
        <p className="text-muted-foreground text-[10px]">
          아래 실격 사유를 선택·입력해 주세요.
        </p>
      ) : null}
    </div>
  );
}
