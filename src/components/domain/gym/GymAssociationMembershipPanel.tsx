"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelGymAssociationMembershipRequestAction,
  disconnectGymAssociationMembershipAction,
  requestGymAssociationMembershipAction,
} from "@/features/gym-association-connection/actions";
import type { GymAssociationMembershipView } from "@/lib/services/gym-association-connection.service";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<
  GymAssociationMembershipView["statusLabel"],
  string
> = {
  "가입 완료": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "승인 대기": "bg-amber-50 text-amber-900 border-amber-200",
  "가입 거절": "bg-rose-50 text-rose-800 border-rose-200",
  "연결 해제": "bg-slate-50 text-slate-700 border-slate-200",
  "요청 취소": "bg-slate-50 text-slate-600 border-slate-200",
};

export function GymAssociationMembershipPanel({
  memberships,
  availableAssociations,
  canManage,
}: {
  memberships: GymAssociationMembershipView[];
  availableAssociations: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedAssociationId, setSelectedAssociationId] = useState(
    availableAssociations[0]?.id ?? "",
  );

  function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
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

  return (
    <section className="space-y-4 rounded-xl border border-matchon-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-matchon-text-primary">
            가입 협회
          </h2>
          <p className="mt-1 text-sm text-matchon-text-secondary">
            협회 가입 없이도 체육관을 사용할 수 있으며, 여러 협회에 동시에 가입할
            수 있습니다.
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {canManage && availableAssociations.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-matchon-border p-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm">
            <span className="mb-1 block text-matchon-text-secondary">
              협회 추가 가입
            </span>
            <select
              className="w-full rounded-md border border-matchon-border px-3 py-2"
              value={selectedAssociationId}
              onChange={(e) => setSelectedAssociationId(e.target.value)}
              disabled={pending}
            >
              {availableAssociations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !selectedAssociationId}
            className="rounded-md bg-matchon-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() =>
              run(() =>
                requestGymAssociationMembershipAction(selectedAssociationId),
              )
            }
          >
            가입 요청
          </button>
        </div>
      ) : null}

      {memberships.length === 0 ? (
        <p className="text-sm text-matchon-text-secondary">
          가입한 협회가 없습니다. 필요 시 협회에 가입 요청을 보낼 수 있습니다.
        </p>
      ) : (
        <ul className="divide-y divide-matchon-border rounded-lg border border-matchon-border">
          {memberships.map((row) => (
            <li
              key={`${row.kind}-${row.id}`}
              className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-matchon-text-primary">
                  {row.associationName}
                </p>
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                    STATUS_BADGE[row.statusLabel],
                  )}
                >
                  {row.statusLabel}
                </span>
              </div>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  {row.canCancelRequest ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-md border border-matchon-border px-3 py-1.5 text-xs disabled:opacity-60"
                      onClick={() =>
                        run(() =>
                          cancelGymAssociationMembershipRequestAction(row.id),
                        )
                      }
                    >
                      요청 취소
                    </button>
                  ) : null}
                  {row.canDisconnect ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-700 disabled:opacity-60"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `${row.associationName} 연결을 해제할까요? 다른 협회 가입에는 영향이 없습니다.`,
                          )
                        ) {
                          return;
                        }
                        run(() =>
                          disconnectGymAssociationMembershipAction(row.id),
                        );
                      }}
                    >
                      연결 해제
                    </button>
                  ) : null}
                  {row.canReRequest ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-md border border-matchon-border px-3 py-1.5 text-xs disabled:opacity-60"
                      onClick={() =>
                        run(() =>
                          requestGymAssociationMembershipAction(
                            row.associationOrganizerId,
                          ),
                        )
                      }
                    >
                      재가입 요청
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
