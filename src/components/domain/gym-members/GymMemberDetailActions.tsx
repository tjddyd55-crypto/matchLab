"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { Button } from "@/components/ui/button";
import {
  pauseGymMemberAction,
  promoteGymMemberToFighterAction,
  resumeGymMemberAction,
  setGymMemberStatusAction,
  softDeleteGymMemberAction,
} from "@/features/gym-members/actions";
import { GymMemberStatus } from "@/lib/enums";
import { todayUtcDateOnlyString } from "@/lib/date-only";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export function GymMemberDetailActions({
  memberId,
  memberStatus,
  hasFighter,
  defaultPrimarySport,
}: {
  memberId: string;
  memberStatus: GymMemberStatus;
  hasFighter: boolean;
  defaultPrimarySport?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createLogin, setCreateLogin] = useState(false);
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
    <div className="space-y-6">
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
                if (
                  !window.confirm(
                    "퇴회 처리하시겠습니까? 이용권도 종료됩니다.",
                  )
                ) {
                  return;
                }
                run(
                  () =>
                    setGymMemberStatusAction(
                      memberId,
                      GymMemberStatus.withdrawn,
                    ),
                  "퇴회 처리했습니다.",
                );
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
                if (!window.confirm("회원을 삭제(소프트)하시겠습니까?")) {
                  return;
                }
                run(async () => {
                  const result = await softDeleteGymMemberAction(memberId);
                  if (result.ok) {
                    router.push("/gym/members");
                    router.refresh();
                  }
                  return result;
                });
              }}
            >
              삭제
            </Button>
          </div>
        </section>
      ) : null}

      {!hasFighter && !isWithdrawn ? (
        <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
          <h3 className="text-sm font-semibold text-matchon-text-primary">
            선수로 등록
          </h3>
          <p className="text-xs text-matchon-text-secondary">
            생년월일·성별이 회원 정보에 있어야 합니다.
          </p>
          <form
            action={(formData) => {
              formData.set(
                "createLoginAccount",
                createLogin ? "true" : "false",
              );
              run(
                () => promoteGymMemberToFighterAction(memberId, formData),
                "선수로 등록했습니다.",
              );
            }}
            className="space-y-2"
          >
            <label className="block space-y-1 text-sm">
              <span>키 (cm)</span>
              <input
                name="height"
                inputMode="decimal"
                className={matchonFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>체중 (kg)</span>
              <input
                name="weight"
                inputMode="decimal"
                className={matchonFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>주 종목</span>
              <input
                name="primarySport"
                defaultValue={defaultPrimarySport ?? ""}
                className={matchonFieldInputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
              />
              로그인 계정 생성
            </label>
            {createLogin ? (
              <>
                <label className="block space-y-1 text-sm">
                  <span>로그인 아이디</span>
                  <input name="loginId" className={matchonFieldInputClass} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>초기 비밀번호 (비우면 자동 생성)</span>
                  <input
                    name="password"
                    type="password"
                    className={matchonFieldInputClass}
                  />
                </label>
              </>
            ) : null}
            <Button type="submit" size="sm" disabled={pending}>
              선수 등록
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
