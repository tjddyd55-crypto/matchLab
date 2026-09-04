"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  pauseGymMemberAction,
  resumeGymMemberAction,
  setGymMemberStatusAction,
  softDeleteGymMemberAction,
} from "@/features/gym-members/actions";
import { GymMemberStatus } from "@/lib/enums";
import { todayUtcDateOnlyString } from "@/lib/date-only";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

/** Membership-tab operational actions (pause / withdraw / delete). Fighter registration lives on overview. */
export function GymMemberDetailActions({
  memberId,
  memberStatus,
}: {
  memberId: string;
  memberStatus: GymMemberStatus;
  /** @deprecated fighter promote moved to overview */
  hasFighter?: boolean;
  /** @deprecated */
  defaultPrimarySport?: string | null;
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const today = todayUtcDateOnlyString();

  function run(
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
    successMsg?: string,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error?.message ?? "처리에 실패했습니다.");
        return;
      }
      if (successMsg) setMessage(successMsg);
      router.refresh();
    });
  }

  function onFormAction(
    action: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>,
    successMsg: string,
  ) {
    return (formData: FormData) => {
      run(() => action(formData), successMsg);
    };
  }

  const isWithdrawn = memberStatus === GymMemberStatus.withdrawn;
  const isPaused = memberStatus === GymMemberStatus.paused;

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {!isWithdrawn ? (
        <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
          <h3 className="text-sm font-semibold text-matchon-text-primary">
            상태 변경
          </h3>
          <div className="flex flex-wrap gap-2">
            {isPaused ? (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => resumeGymMemberAction(memberId), "휴회를 해제했습니다.")
                }
              >
                휴회 해제
              </Button>
            ) : (
              <details className="w-full max-w-md rounded-lg border border-matchon-border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  휴회 등록
                </summary>
                <form
                  action={onFormAction(
                    (fd) => pauseGymMemberAction(memberId, fd),
                    "휴회 처리했습니다.",
                  )}
                  className="mt-3 space-y-2"
                >
                  <AppDateInput
                    name="pausedAt"
                    label="휴회 시작일"
                    defaultValue={today}
                  />
                  <AppDateInput name="resumeAt" label="재개 예정일" />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="extendEndsAt"
                      value="true"
                      defaultChecked
                    />
                    종료일 연장
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>사유</span>
                    <input name="reason" className={matchonFieldInputClass} />
                  </label>
                  <Button type="submit" size="sm" disabled={pending}>
                    휴회 적용
                  </Button>
                </form>
              </details>
            )}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                void (async () => {
                  const ok = await confirm({
                    title: "퇴회 처리하시겠습니까?",
                    description: "이용권도 종료됩니다.",
                    variant: "danger",
                  });
                  if (!ok) return;
                  run(
                    () =>
                      setGymMemberStatusAction(
                        memberId,
                        GymMemberStatus.withdrawn,
                      ),
                    "퇴회 처리했습니다.",
                  );
                })();
              }}
            >
              퇴회
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                void (async () => {
                  const ok = await confirm({
                    title: "회원을 삭제(소프트)하시겠습니까?",
                    variant: "danger",
                  });
                  if (!ok) return;
                  run(async () => {
                    const result = await softDeleteGymMemberAction(memberId);
                    if (result.ok) {
                      router.push("/gym/members");
                      router.refresh();
                    }
                    return result;
                  });
                })();
              }}
            >
              삭제
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
