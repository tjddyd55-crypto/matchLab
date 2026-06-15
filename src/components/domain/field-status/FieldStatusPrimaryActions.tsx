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
}: {
  row: FieldStatusRowDTO;
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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-7 text-xs"
          disabled={pending}
          onClick={() =>
            startTransition(() => run(weighInPassFormAction))
          }
        >
          계체통과
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 text-xs"
          disabled={pending}
          onClick={() =>
            startTransition(() => run(weighInFailFormAction))
          }
        >
          계체실패
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="h-7 text-xs"
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
      </div>
      {showDisqualifyHint && !isDisqualified ? (
        <p className="text-muted-foreground text-[10px]">
          아래 실격 사유를 선택·입력해 주세요.
        </p>
      ) : null}
    </div>
  );
}
