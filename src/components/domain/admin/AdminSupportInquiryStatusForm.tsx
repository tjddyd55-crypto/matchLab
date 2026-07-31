"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateDesktopSupportInquiryStatusAction } from "@/features/desktop-support-inquiry/actions";
import {
  DESKTOP_SUPPORT_INQUIRY_STATUSES,
  DESKTOP_SUPPORT_STATUS_LABELS,
  type DesktopSupportInquiryStatusCode,
} from "@/lib/desktop/support-inquiry";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import type { ActionResult } from "@/lib/action-result";

type State = ActionResult<{ id: string }> | null;

export function AdminSupportInquiryStatusForm({
  inquiryId,
  currentStatus,
  currentAdminNote,
}: {
  inquiryId: string;
  currentStatus: DesktopSupportInquiryStatusCode;
  currentAdminNote: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateDesktopSupportInquiryStatusAction,
    null as State,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={inquiryId} />
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">상태</span>
        <select
          name="status"
          className={matchonFieldInputClass}
          defaultValue={currentStatus}
          disabled={pending}
        >
          {DESKTOP_SUPPORT_INQUIRY_STATUSES.map((code) => (
            <option key={code} value={code}>
              {DESKTOP_SUPPORT_STATUS_LABELS[code]}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">처리 메모</span>
        <textarea
          name="adminNote"
          className={`${matchonFieldInputClass} min-h-[5rem] py-2`}
          defaultValue={currentAdminNote ?? ""}
          maxLength={2000}
          disabled={pending}
          placeholder="내부 메모 (선택)"
        />
      </label>
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-sm text-matchon-text-secondary">저장되었습니다.</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "상태 저장"}
      </Button>
    </form>
  );
}
