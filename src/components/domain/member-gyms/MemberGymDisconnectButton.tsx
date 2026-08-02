"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { disconnectGymAssociationByOrganizerAction } from "@/features/gym-association-connection/actions";

export function MemberGymDisconnectButton({
  memberGymId,
  gymName,
  disabled,
}: {
  memberGymId: string;
  gymName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : null}
      <button
        type="button"
        disabled={disabled || pending}
        className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-700 disabled:opacity-60"
        onClick={() => {
          if (
            !window.confirm(
              `${gymName}와의 협회 연결을 해제할까요? 체육관 회원·선수 데이터는 삭제되지 않습니다.`,
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const res =
              await disconnectGymAssociationByOrganizerAction(memberGymId);
            if (!res.ok) {
              setError(res.error.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        연결 해제
      </button>
    </div>
  );
}
