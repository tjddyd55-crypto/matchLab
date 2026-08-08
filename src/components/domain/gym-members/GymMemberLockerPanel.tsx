"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { Button } from "@/components/ui/button";
import {
  createGymMemberLockerRentalAction,
  endGymMemberLockerRentalAction,
  extendGymMemberLockerRentalAction,
} from "@/features/gym-members/actions";
import { formatUtcDateOnly, todayUtcDateOnlyString } from "@/lib/date-only";
import { formatWon } from "@/lib/format-won";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export type LockerRentalRow = {
  id: string;
  lockerLabel: string;
  startedAt: Date | string;
  endsAt: Date | string | null;
  amount: number;
  memo: string | null;
  endedAt: Date | string | null;
  displayStatus: "active" | "ended" | "expired";
};

const STATUS_LABEL = {
  active: "이용 중",
  ended: "종료",
  expired: "기간 만료",
} as const;

export function GymMemberLockerPanel({
  memberId,
  rentals,
}: {
  memberId: string;
  rentals: LockerRentalRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [extendingId, setExtendingId] = useState<string | null>(null);

  const active = rentals.find((r) => r.displayStatus !== "ended" && !r.endedAt);

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
    <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">사물함</h2>
        {!active ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? "닫기" : "사물함 등록"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {active ? (
        <div className="space-y-2 rounded-lg bg-matchon-surface px-3 py-2 text-sm">
          <p>
            <span className="text-matchon-text-secondary">현재 </span>
            <strong>{active.lockerLabel}</strong>
            <span className="ml-2 text-matchon-text-secondary">
              {STATUS_LABEL[active.displayStatus]}
            </span>
          </p>
          <p className="text-matchon-text-secondary">
            {formatUtcDateOnly(active.startedAt, "-")}
            {" ~ "}
            {active.endsAt ? formatUtcDateOnly(active.endsAt, "-") : "무기한"}
            {" · 최초 등록 금액 "}
            {formatWon(active.amount)}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                setExtendingId(extendingId === active.id ? null : active.id)
              }
            >
              연장
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() => endGymMemberLockerRentalAction(memberId, active.id))
              }
            >
              종료
            </Button>
          </div>
          {extendingId === active.id ? (
            <form
              className="grid gap-2 border-t border-matchon-border pt-3 sm:grid-cols-2"
              action={(fd) => {
                run(
                  () =>
                    extendGymMemberLockerRentalAction(memberId, active.id, fd),
                  () => setExtendingId(null),
                );
              }}
            >
              <label className="block space-y-1 text-sm">
                <span>새 종료일 *</span>
                <AppDateInput name="newEndsAt" required />
              </label>
              <label className="block space-y-1 text-sm">
                <span>추가 금액</span>
                <input
                  name="additionalAmount"
                  inputMode="numeric"
                  defaultValue={0}
                  className={matchonFieldInputClass}
                />
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" size="sm" disabled={pending}>
                  연장 저장
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-matchon-text-secondary">
          이용 중인 사물함이 없습니다.
        </p>
      )}

      {showCreate && !active ? (
        <form
          className="grid gap-3 rounded-lg border border-dashed border-matchon-border p-3 sm:grid-cols-2"
          action={(fd) => {
            fd.set("createPayment", "true");
            run(() => createGymMemberLockerRentalAction(memberId, fd), () =>
              setShowCreate(false),
            );
          }}
        >
          <label className="block space-y-1 text-sm">
            <span>사물함 번호 *</span>
            <input
              name="lockerLabel"
              required
              className={matchonFieldInputClass}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>금액</span>
            <input
              name="amount"
              inputMode="numeric"
              defaultValue={0}
              className={matchonFieldInputClass}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>시작일 *</span>
            <AppDateInput
              name="startedAt"
              required
              defaultValue={todayUtcDateOnlyString()}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>종료일</span>
            <AppDateInput name="endsAt" />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>메모</span>
            <input name="memo" className={matchonFieldInputClass} />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              등록
            </Button>
          </div>
        </form>
      ) : null}

      {rentals.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-matchon-text-secondary">
            이용 이력
          </h3>
          <ul className="divide-y divide-matchon-border text-sm">
            {rentals.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap justify-between gap-2 py-2"
              >
                <span>
                  {r.lockerLabel} · {STATUS_LABEL[r.displayStatus]}
                </span>
                <span className="text-matchon-text-secondary">
                  {formatUtcDateOnly(r.startedAt, "-")}
                  {" ~ "}
                  {r.endedAt
                    ? formatUtcDateOnly(r.endedAt, "-")
                    : r.endsAt
                      ? formatUtcDateOnly(r.endsAt, "-")
                      : "—"}
                  {" · "}
                  {formatWon(r.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
