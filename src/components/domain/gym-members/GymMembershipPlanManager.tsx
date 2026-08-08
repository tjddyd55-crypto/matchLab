"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGymMembershipPlanAction,
  deleteGymMembershipPlanAction,
  reorderGymMembershipPlansAction,
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
  plans: initialPlans,
}: {
  plans: GymMembershipPlanRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plans, setPlans] = useState(initialPlans);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

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

  function persistOrder(next: GymMembershipPlanRow[]) {
    setPlans(next);
    run(() => reorderGymMembershipPlansAction(next.map((p) => p.id)));
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...plans];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    persistOrder(next);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = plans.findIndex((p) => p.id === dragId);
    const to = plans.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = [...plans];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row!);
    setDragId(null);
    persistOrder(next);
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
            {plans.map((plan, idx) => (
              <div
                key={plan.id}
                className="space-y-2 rounded-xl border border-matchon-border bg-white p-4"
                draggable
                onDragStart={() => setDragId(plan.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(plan.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      <span className="mr-2 cursor-grab text-matchon-text-secondary">
                        ⋮⋮
                      </span>
                      {plan.name}
                    </p>
                    <p className="text-xs text-matchon-text-secondary">
                      {durationText(plan)} · {formatWon(plan.price)}
                      {!plan.isActive ? " · 비활성" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={pending || idx === 0}
                      onClick={() => move(idx, -1)}
                      aria-label="위로"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={pending || idx === plans.length - 1}
                      onClick={() => move(idx, 1)}
                      aria-label="아래로"
                    >
                      ↓
                    </Button>
                  </div>
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
                  <th className="w-10 px-3 py-2">정렬</th>
                  <th className="px-3 py-2">이용권</th>
                  <th className="px-3 py-2">기간</th>
                  <th className="px-3 py-2">가격</th>
                  <th className="px-3 py-2">이용</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">관리</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, idx) => (
                  <tr
                    key={plan.id}
                    className="border-b border-matchon-border align-top last:border-0"
                    draggable
                    onDragStart={() => setDragId(plan.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(plan.id)}
                  >
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="cursor-grab text-matchon-text-secondary">
                          ⋮⋮
                        </span>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          disabled={pending || idx === 0}
                          onClick={() => move(idx, -1)}
                          aria-label="위로"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          disabled={pending || idx === plans.length - 1}
                          onClick={() => move(idx, 1)}
                          aria-label="아래로"
                        >
                          ↓
                        </Button>
                      </div>
                    </td>
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
    <form
      action={onUpdate}
      className="grid gap-3 rounded-lg border border-matchon-border bg-matchon-surface/40 p-3 sm:grid-cols-2"
    >
      <label className="block space-y-1 text-sm sm:col-span-2">
        <span>이용권명 *</span>
        <input
          name="name"
          required
          defaultValue={plan.name}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>기간 유형</span>
        <select
          name="durationType"
          className={matchonFieldInputClass}
          defaultValue={plan.durationType}
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
          defaultValue={plan.durationValue ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>가격</span>
        <input
          name="price"
          inputMode="numeric"
          defaultValue={plan.price}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>정렬</span>
        <input
          name="sortOrder"
          inputMode="numeric"
          defaultValue={plan.sortOrder}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-sm sm:col-span-2">
        <span>설명</span>
        <input
          name="description"
          defaultValue={plan.description ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="hidden" name="isActive" value="false" />
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={plan.isActive}
        />
        활성
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          저장
        </Button>
        <Button
          type="button"
          size="sm"
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
