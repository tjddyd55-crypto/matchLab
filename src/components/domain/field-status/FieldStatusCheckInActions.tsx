"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  checkInActionFormAction,
  markNoShowFormAction,
  setCheckInStatusFormAction,
} from "@/features/field-status/actions";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { CheckInStatus } from "@/lib/enums";
import { appendOnsiteOpsToken, useOnsiteOpsToken } from "@/components/domain/onsite-ops/OnsiteOpsTokenContext";

export function FieldStatusCheckInActions({
  row,
  hideTitle = false,
}: {
  row: FieldStatusRowDTO;
  hideTitle?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const opsToken = useOnsiteOpsToken();
  async function run(
    action: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>,
    extra?: Record<string, string>,
  ) {
    const fd = new FormData();
    fd.set("applicationId", row.applicationId);
    appendOnsiteOpsToken(fd, opsToken);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    }
    const res = await action(fd);
    if (!res.ok) {
      setError(res.error?.message ?? "처리에 실패했습니다.");
      return;
    }
    setError(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {hideTitle ? null : <p className="text-sm font-medium">현장 확인</p>}
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-9 text-xs"
          variant={row.checkInStatus === CheckInStatus.pending ? "default" : "outline"}
          disabled={pending || row.checkInStatus === CheckInStatus.pending}
          onClick={() =>
            startTransition(() =>
              run(setCheckInStatusFormAction, { status: "pending" }),
            )
          }
        >
          미확인
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 text-xs"
          variant={
            row.checkInStatus === CheckInStatus.checked_in ? "default" : "outline"
          }
          disabled={pending || row.checkInStatus === CheckInStatus.checked_in}
          onClick={() =>
            startTransition(() => run(checkInActionFormAction))
          }
        >
          확인 완료
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 text-xs"
          variant={
            row.checkInStatus === CheckInStatus.no_show ? "destructive" : "outline"
          }
          disabled={pending || row.checkInStatus === CheckInStatus.no_show}
          onClick={() =>
            startTransition(() => run(markNoShowFormAction))
          }
        >
          미출석
        </Button>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
