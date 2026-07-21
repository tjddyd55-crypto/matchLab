"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGymMembershipPlanAction,
  deleteGymMembershipPlanAction,
  updateGymMembershipPlanAction,
} from "@/features/gym-members/actions";
import { GymMembershipDurationType } from "@/lib/enums";
import { formatWon } from "@/lib/format-won";
import { Button } from "@/components/ui/button";
import {
  matchonCompactTableWrapClass,
  matchonFieldInputClass,
  matchonMobileCardListClass,
} from "@/lib/ui/matchon-shell-ui";

export type GymMembershipPlanRow = {
  id: string;
  name: string;
  durationType: GymMembershipDurationType;
  durationValue: number | null;
  price: number;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  activeSubscriptionCount: number;
};

const DURATION_LABEL: Record<GymMembershipDurationType, string> = {
  days: "일",
  months: "개월",
  fixed_end: "종료일 지정",
};

function durationText(plan: GymMembershipPlanRow): string {
  if (plan.durationType === GymMembershipDurationType.fixed_end) {
    return "종료일 지정";
  }
  return `${plan.durationValue ?? "—"} ${DURATION_LABEL[plan.durationType]}`;
}

export function GymMembershipPlanManager({
  plans,
}: {
  plans: GymMembershipPlanRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function run(
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
    onOk?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error?.message ?? "처리에 실패했습니다.");
        return;
      }
      onOk?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
        <h2 className="text-base font-semibold">이용권 추가</h2>
        <form
          action={(formData) => {
            run(() => createGymMembershipPlanAction(formData));
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>이용권명 *</span>
            <input name="name" required className={matchonFieldInputClass} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>기간 유형</span>
            <select
              name="durationType"
              className={matchonFieldInputClass}
              defaultValue={GymMembershipDurationType.months}
            >
              <option value={GymMembershipDurationType.months}>개월</option>
              <option value={GymMembershipDurationType.days}>일</option>
              <option value={GymMembershipDurationType.fixed_end}>
                종료일 지정
              </option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>기간 값</span>
            <input
              name="durationValue"
              inputMode="numeric"
              defaultValue={1}
              className={matchonFieldInputClass}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>가격</span>
            <input
              name="price"
              inputMode="numeric"
              defaultValue={0}
              className={matchonFieldInputClass}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>정렬</span>
            <input
              name="sortOrder"
              inputMode="numeric"
              defaultValue={0}
              className={matchonFieldInputClass}
            />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>설명</span>
            <input name="description" className={matchonFieldInputClass} />
          </label>
          <input type="hidden" name="isActive" value="true" />
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "저장 중…" : "추가"}
            </Button>
          </div>
        </form>
      </section>

      {plans.length === 0 ? (
        <p className="text-sm text-matchon-text-secondary">
          등록된 이용권이 없습니다.
        </p>
      ) : (
        <>
          <div className={matchonMobileCardListClass}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="space-y-2 rounded-xl border border-matchon-border bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-xs text-matchon-text-secondary">
                      {durationText(plan)} · {formatWon(plan.price)}
                      {!plan.isActive ? " · 비활성" : ""}
                    </p>
                  </div>
                  <p className="text-xs text-matchon-text-secondary">
                    이용 {plan.activeSubscriptionCount}
                  </p>
                </div>
                <PlanEditBlock
                  plan={plan}
                  editing={editingId === plan.id}
                  pending={pending}
                  onToggle={() =>
                    setEditingId((id) => (id === plan.id ? null : plan.id))
                  }
                  onUpdate={(fd) =>
                    run(() => updateGymMembershipPlanAction(plan.id, fd), () =>
                      setEditingId(null),
                    )
                  }
                  onDelete={() => {
                    if (!window.confirm(`「${plan.name}」을(를) 삭제할까요?`)) {
                      return;
                    }
                    run(() => deleteGymMembershipPlanAction(plan.id));
                  }}
                />
              </div>
            ))}
          </div>

          <div className={matchonCompactTableWrapClass}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-matchon-border bg-matchon-surface/50 text-xs font-medium text-matchon-text-secondary">
                <tr>
                  <th className="px-3 py-2">이용권</th>
                  <th className="px-3 py-2">기간</th>
                  <th className="px-3 py-2">가격</th>
                  <th className="px-3 py-2">이용</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">관리</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="border-b border-matchon-border align-top last:border-0"
                  >
                    <td className="px-3 py-3">
                      <p className="font-medium">{plan.name}</p>
                      {plan.description ? (
                        <p className="text-xs text-matchon-text-secondary">
                          {plan.description}
                        </p>
                      ) : null}
                      {editingId === plan.id ? (
                        <div className="mt-3">
                          <PlanEditFields
                            plan={plan}
                            pending={pending}
                            onUpdate={(fd) =>
                              run(
                                () =>
                                  updateGymMembershipPlanAction(plan.id, fd),
                                () => setEditingId(null),
                              )
                            }
                            onCancel={() => setEditingId(null)}
                          />
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {durationText(plan)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatWon(plan.price)}
                    </td>
                    <td className="px-3 py-3">{plan.activeSubscriptionCount}</td>
                    <td className="px-3 py-3">
                      {plan.isActive ? "활성" : "비활성"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            setEditingId((id) =>
                              id === plan.id ? null : plan.id,
                            )
                          }
                        >
                          {editingId === plan.id ? "닫기" : "수정"}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `「${plan.name}」을(를) 삭제할까요?`,
                              )
                            ) {
                              return;
                            }
                            run(() => deleteGymMembershipPlanAction(plan.id));
                          }}
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PlanEditBlock({
  plan,
  editing,
  pending,
  onToggle,
  onUpdate,
  onDelete,
}: {
  plan: GymMembershipPlanRow;
  editing: boolean;
  pending: boolean;
  onToggle: () => void;
  onUpdate: (fd: FormData) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={onToggle}
        >
          {editing ? "닫기" : "수정"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="destructive"
          disabled={pending}
          onClick={onDelete}
        >
          삭제
        </Button>
      </div>
      {editing ? (
        <PlanEditFields
          plan={plan}
          pending={pending}
          onUpdate={onUpdate}
          onCancel={onToggle}
        />
      ) : null}
    </div>
  );
}

function PlanEditFields({
  plan,
  pending,
  onUpdate,
  onCancel,
}: {
  plan: GymMembershipPlanRow;
  pending: boolean;
  onUpdate: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onUpdate} className="grid gap-2 sm:grid-cols-2">
      <label className="block space-y-1 text-xs sm:col-span-2">
        <span>이용권명</span>
        <input
          name="name"
          required
          defaultValue={plan.name}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-xs">
        <span>기간 유형</span>
        <select
          name="durationType"
          defaultValue={plan.durationType}
          className={matchonFieldInputClass}
        >
          <option value={GymMembershipDurationType.months}>개월</option>
          <option value={GymMembershipDurationType.days}>일</option>
          <option value={GymMembershipDurationType.fixed_end}>
            종료일 지정
          </option>
        </select>
      </label>
      <label className="block space-y-1 text-xs">
        <span>기간 값</span>
        <input
          name="durationValue"
          inputMode="numeric"
          defaultValue={plan.durationValue ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-xs">
        <span>가격</span>
        <input
          name="price"
          inputMode="numeric"
          defaultValue={plan.price}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-xs">
        <span>정렬</span>
        <input
          name="sortOrder"
          inputMode="numeric"
          defaultValue={plan.sortOrder}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-xs sm:col-span-2">
        <span>설명</span>
        <input
          name="description"
          defaultValue={plan.description ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-xs sm:col-span-2">
        <span>상태</span>
        <select
          name="isActive"
          defaultValue={plan.isActive ? "true" : "false"}
          className={matchonFieldInputClass}
        >
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" size="xs" disabled={pending}>
          저장
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
