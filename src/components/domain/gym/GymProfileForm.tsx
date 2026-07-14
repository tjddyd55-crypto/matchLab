"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateGymProfileAction } from "@/features/gym-profile/actions";
import { MEMBER_GYM_STATUS_LABEL } from "@/lib/ui-labels/member-gym";
import type { AssociationMemberGymStatus } from "@/lib/enums";

export function GymProfileForm({
  gym,
  memberCode,
  memberStatus,
  readOnly,
}: {
  gym: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  };
  memberCode: string | null;
  memberStatus: AssociationMemberGymStatus | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="max-w-lg space-y-3 rounded-md border border-matchon-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (readOnly) return;
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const res = await updateGymProfileAction({
            phone: String(fd.get("phone") || ""),
            address: String(fd.get("address") || ""),
          });
          if (!res.ok) {
            setError(res.error.message);
            return;
          }
          setMessage("저장했습니다.");
          router.refresh();
        });
      }}
    >
      <label className="block text-xs">
        체육관명
        <input
          disabled
          value={gym.name}
          className="mt-1 w-full rounded-md border bg-matchon-surface px-3 py-2 text-sm"
        />
      </label>
      {memberCode ? (
        <label className="block text-xs">
          회원사 코드
          <input
            disabled
            value={memberCode}
            className="mt-1 w-full rounded-md border bg-matchon-surface px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      {memberStatus ? (
        <p className="text-xs text-matchon-text-secondary">
          협회 상태: {MEMBER_GYM_STATUS_LABEL[memberStatus]}
        </p>
      ) : null}
      <label className="block text-xs">
        체육관 연락처
        <input
          name="phone"
          defaultValue={gym.phone ?? ""}
          disabled={readOnly}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:bg-matchon-surface"
        />
      </label>
      <label className="block text-xs">
        주소
        <input
          name="address"
          defaultValue={gym.address ?? ""}
          disabled={readOnly}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:bg-matchon-surface"
        />
      </label>
      <p className="text-xs text-matchon-text-secondary">
        사업자번호·대표자·이메일·소개·로고 필드는 현재 Gym schema에 없어 이번
        단계에서 추가하지 않았습니다.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? (
        <p className="text-sm text-matchon-primary">{message}</p>
      ) : null}
      {!readOnly ? (
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-matchon-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      ) : null}
    </form>
  );
}
