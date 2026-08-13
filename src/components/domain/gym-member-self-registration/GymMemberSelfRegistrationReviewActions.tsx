"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveSelfRegistrationRequestAction,
  rejectSelfRegistrationRequestAction,
} from "@/features/gym-member-self-registration/owner-actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { GymMemberRegistrationRequestStatus } from "@/lib/enums";

export function GymMemberSelfRegistrationReviewActions({
  requestId,
  status,
  hasDuplicate,
  approvedMemberId,
}: {
  requestId: string;
  status: GymMemberRegistrationRequestStatus;
  hasDuplicate: boolean;
  approvedMemberId: string | null;
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== GymMemberRegistrationRequestStatus.pending) {
    return (
      <div className="rounded-xl border border-matchon-border bg-white p-4 text-sm">
        {status === GymMemberRegistrationRequestStatus.approved ? (
          <p>
            승인됨
            {approvedMemberId ? (
              <>
                {" · "}
                <button
                  type="button"
                  className="text-matchon-primary underline"
                  onClick={() => router.push(`/gym/members/${approvedMemberId}`)}
                >
                  회원 상세
                </button>
              </>
            ) : null}
          </p>
        ) : (
          <p>반려됨</p>
        )}
      </div>
    );
  }

  function approve(confirmDuplicate: boolean) {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("requestId", requestId);
      if (confirmDuplicate) fd.set("confirmDuplicate", "true");
      const result = await approveSelfRegistrationRequestAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(`/gym/members/${result.data.memberId}`);
      router.refresh();
    });
  }

  async function reject() {
    const ok = await confirm({
      title: "이 등록 요청을 반려할까요?",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("requestId", requestId);
      const result = await rejectSelfRegistrationRequestAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push("/gym/members/registrations");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {hasDuplicate ? (
        <p className="text-sm text-amber-800">
          중복 가능성이 있습니다. 확인 후 강제 승인할 수 있습니다.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          disabled={pending}
          onClick={() => approve(false)}
        >
          회원으로 등록
        </Button>
        {hasDuplicate ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={() => approve(true)}
          >
            중복 확인하고 등록
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={pending}
          onClick={reject}
        >
          반려
        </Button>
      </div>
    </div>
  );
}
