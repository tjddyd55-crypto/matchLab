"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { promoteGymMemberToFighterAction } from "@/features/gym-members/actions";
import { formatPhoneNumber } from "@/lib/phone";
import { formatUtcDateOnly } from "@/lib/date-only";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type PromotableMemberOption = {
  id: string;
  memberNumber: string;
  name: string;
  phone: string;
  birthDate: Date | string | null;
  gender: string | null;
};

export function GymFighterPromoteFromMember({
  members,
  selectedMemberId,
  searchQ,
}: {
  members: PromotableMemberOption[];
  selectedMemberId?: string;
  searchQ?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    loginId: string;
    temporaryPassword: string;
  } | null>(null);
  const [createLogin, setCreateLogin] = useState(false);

  const selected =
    members.find((m) => m.id === selectedMemberId) ?? null;

  function submit(formData: FormData) {
    if (!selected) return;
    setError(null);
    setCredentials(null);
    formData.set("createLoginAccount", createLogin ? "true" : "false");

    startTransition(async () => {
      const result = await promoteGymMemberToFighterAction(
        selected.id,
        formData,
      );
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (result.data.loginCredentials) {
        setCredentials(result.data.loginCredentials);
      }
      router.push(`/gym/fighters/${result.data.fighterId}/edit`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
        <h2 className="text-base font-semibold">기존 회원에서 선택</h2>
        <p className="text-sm text-matchon-text-secondary">
          선수로 아직 연결되지 않은 회원만 표시됩니다.
        </p>
        <form method="get" className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={searchQ ?? ""}
            placeholder="이름, 연락처, 회원번호"
            className={cn(matchonFieldInputClass, "max-w-sm flex-1")}
          />
          {selectedMemberId ? (
            <input type="hidden" name="memberId" value={selectedMemberId} />
          ) : null}
          <Button type="submit" size="sm" variant="outline">
            검색
          </Button>
        </form>

        {members.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">
            승격 가능한 회원이 없습니다.{" "}
            <Link
              href="/gym/members/new?asFighter=1"
              className="font-semibold text-matchon-primary underline"
            >
              새 회원·선수로 등록
            </Link>
            하세요.
          </p>
        ) : (
          <ul className="divide-y divide-matchon-border rounded-lg border border-matchon-border">
            {members.map((m) => {
              const href = `/gym/fighters/new?memberId=${encodeURIComponent(m.id)}${
                searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""
              }`;
              const active = m.id === selectedMemberId;
              return (
                <li key={m.id}>
                  <Link
                    href={href}
                    className={cn(
                      "block px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-matchon-primary-light/60"
                        : "hover:bg-matchon-surface",
                    )}
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="mt-0.5 block text-xs text-matchon-text-secondary">
                      {m.memberNumber} · {formatPhoneNumber(m.phone)}
                      {m.birthDate
                        ? ` · ${formatUtcDateOnly(m.birthDate)}`
                        : ""}
                      {m.gender ? ` · ${m.gender}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-dashed border-matchon-border bg-matchon-surface/40 p-4">
        <h2 className="text-base font-semibold">또는 새로 등록</h2>
        <p className="text-sm text-matchon-text-secondary">
          회원 정보가 없으면 회원·선수를 한 번에 등록할 수 있습니다.
        </p>
        <Link
          href="/gym/members/new?asFighter=1"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          새 회원·선수 등록
        </Link>
      </section>

      {selected ? (
        <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
          <h2 className="text-base font-semibold">
            「{selected.name}」을(를) 선수로 등록
          </h2>
          {!selected.birthDate || !selected.gender ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              생년월일·성별이 필요합니다.{" "}
              <Link
                href={`/gym/members/${selected.id}/edit`}
                className="font-semibold underline"
              >
                회원 정보 수정
              </Link>
              후 다시 시도해 주세요.
            </p>
          ) : (
            <form action={submit} className="space-y-3">
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {credentials ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  계정: {credentials.loginId} / 임시 비밀번호:{" "}
                  {credentials.temporaryPassword}
                </p>
              ) : null}
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
                <input name="primarySport" className={matchonFieldInputClass} />
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
              <Button type="submit" disabled={pending}>
                {pending ? "등록 중…" : "선수로 등록"}
              </Button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
