"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveGymAssociationMembershipAction,
  rejectGymAssociationMembershipAction,
} from "@/features/gym-association-connection/actions";
import { AssociationGymConnectionRequestStatus } from "@/lib/enums";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<AssociationGymConnectionRequestStatus, string> = {
  pending: "승인 대기",
  approved: "가입 완료",
  rejected: "거절",
  cancelled: "요청 취소",
  withdrawn: "연결 해제",
};

export type AssociationGymConnectionRequestRow = {
  id: string;
  status: AssociationGymConnectionRequestStatus;
  memo: string | null;
  createdAt: string;
  reviewedAt: string | null;
  gym: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    ownerName: string;
    ownerPhone: string | null;
  };
};

export function AssociationGymConnectionRequestPanel({
  rows,
}: {
  rows: AssociationGymConnectionRequestRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error?.message ?? "처리에 실패했습니다.");
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-matchon-text-secondary">
        표시할 연결 요청이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((row) => {
          const pendingStatus =
            row.status === AssociationGymConnectionRequestStatus.pending;
          return (
            <li
              key={row.id}
              className="rounded-xl border border-matchon-border bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-matchon-text-primary">
                    {row.gym.name}
                  </p>
                  <p className="text-sm text-matchon-text-secondary">
                    대표/담당: {row.gym.ownerName}
                    {row.gym.ownerPhone ? ` · ${row.gym.ownerPhone}` : ""}
                  </p>
                  <p className="text-xs text-matchon-text-secondary">
                    요청일{" "}
                    {format(new Date(row.createdAt), "yyyy.MM.dd HH:mm")}
                    {row.reviewedAt
                      ? ` · 처리일 ${format(new Date(row.reviewedAt), "yyyy.MM.dd HH:mm")}`
                      : ""}
                  </p>
                  {row.memo ? (
                    <p className="text-sm text-matchon-text-secondary">
                      메모: {row.memo}
                    </p>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                      pendingStatus
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-700",
                    )}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </div>
                {pendingStatus ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      onClick={() =>
                        run(() =>
                          approveGymAssociationMembershipAction(row.id),
                        )
                      }
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-700 disabled:opacity-60"
                      onClick={() =>
                        run(() =>
                          rejectGymAssociationMembershipAction(row.id),
                        )
                      }
                    >
                      거절
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
