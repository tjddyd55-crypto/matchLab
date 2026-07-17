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

export function FieldStatusCheckInActions({
  row,
}: {
  row: FieldStatusRowDTO;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function run(
    action: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>,
    extra?: Record<string, string>,
  ) {
    const fd = new FormData();
    fd.set("applicationId", row.applicationId);
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
      <p className="text-sm font-medium">현장 확인</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
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
