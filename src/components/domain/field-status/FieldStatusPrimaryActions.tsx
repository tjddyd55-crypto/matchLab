"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markDisqualifiedFormAction,
  weighInFailFormAction,
  weighInPassFormAction,
} from "@/features/field-status/actions";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export function FieldStatusPrimaryActions({
  row,
  showDisqualify = false,
}: {
  row: FieldStatusRowDTO;
  /** 상세 workflow에서는 실격을 사유 구역으로 분리 (기본 false) */
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
  const isPass = weighIn === "pass" || weighIn === "manual_pass";
  const isFail = weighIn === "fail" || weighIn === "manual_fail";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={isPass ? "default" : "outline"}
          className="h-9 text-xs"
          disabled={pending || isPass}
          onClick={() =>
            startTransition(() => run(weighInPassFormAction))
          }
        >
          계체 통과
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isFail ? "default" : "outline"}
          className="h-9 text-xs"
          disabled={pending || isFail}
          onClick={() =>
            startTransition(() => run(weighInFailFormAction))
          }
        >
          계체 실패
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
