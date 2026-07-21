"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { Button, buttonVariants } from "@/components/ui/button";
import { createGymMemberAction } from "@/features/gym-members/actions";
import { todayUtcDateOnlyString, formatUtcDateOnly } from "@/lib/date-only";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phone";

type PlanOption = { id: string; name: string; price: number };

type DuplicateCandidate = {
  id: string;
  memberNumber: string;
  name: string;
  phone: string;
  birthDate: Date | string | null;
};

export function GymMemberCreateForm({
  plans,
  defaultRegisterAsFighter = false,
}: {
  plans: PlanOption[];
  defaultRegisterAsFighter?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(
    null,
  );
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [registerAsFighter, setRegisterAsFighter] = useState(
    defaultRegisterAsFighter,
  );
  const [createLogin, setCreateLogin] = useState(false);

  const joinedDefault = useMemo(() => todayUtcDateOnlyString(), []);

  function submit(formData: FormData) {
    setError(null);
    if (confirmDuplicate) formData.set("confirmDuplicate", "true");
    formData.set("registerAsFighter", registerAsFighter ? "true" : "false");
    formData.set("createLoginAccount", createLogin ? "true" : "false");

    startTransition(async () => {
      const result = await createGymMemberAction(formData);
      if (!result.ok) {
        if (result.error.code === "CONFLICT" && result.error.details) {
          const details = result.error.details as {
            candidates?: DuplicateCandidate[];
          };
          if (details.candidates?.length) {
            setDuplicates(details.candidates);
            setError(result.error.message);
            return;
          }
        }
        setError(result.error.message);
        return;
      }
      router.push(`/gym/members/${result.data.memberId}`);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="mx-auto max-w-2xl space-y-6">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {duplicates && duplicates.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-900">
            비슷한 회원이 이미 등록되어 있습니다.
          </p>
          <ul className="space-y-1 text-amber-900">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/gym/members/${d.id}`}
                  className="underline underline-offset-2"
                >
                  {d.name} · {formatPhoneNumber(d.phone)} · {d.memberNumber}
                  {d.birthDate
                    ? ` · ${formatUtcDateOnly(d.birthDate, "-")}`
                    : ""}
                </Link>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmDuplicate}
              onChange={(e) => setConfirmDuplicate(e.target.checked)}
            />
            중복이어도 새로 등록합니다
          </label>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">기본 정보</h2>
        <label className="block space-y-1 text-sm">
          <span>이름 *</span>
          <input
            name="name"
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <PhoneInput name="phone" label="휴대전화번호" required />
        <label className="block space-y-1 text-sm">
          <span>등록일 *</span>
          <AppDateInput name="joinedAt" defaultValue={joinedDefault} required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>생년월일</span>
          <AppDateInput name="birthDate" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>성별</span>
          <select name="gender" className="w-full rounded-lg border px-3 py-2">
            <option value="">선택</option>
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>이메일</span>
          <input
            name="email"
            type="email"
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <AddressSearchField
          label="주소"
          addressName="address"
          detailName="addressDetail"
          postalName="postalCode"
        />
        <PhoneInput name="emergencyContactPhone" label="비상 연락처 전화" />
        <label className="block space-y-1 text-sm">
          <span>비상 연락처 이름</span>
          <input
            name="emergencyContactName"
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>보호자명</span>
          <input
            name="guardianName"
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <PhoneInput name="guardianPhone" label="보호자 연락처" />
        <label className="block space-y-1 text-sm">
          <span>주 수련 종목</span>
          <input
            name="primarySport"
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>등급/띠</span>
          <input
            name="rankName"
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>메모</span>
          <textarea
            name="memo"
            rows={3}
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">이용권·결제 (선택)</h2>
        <label className="block space-y-1 text-sm">
          <span>이용권</span>
          <select name="planId" className="w-full rounded-lg border px-3 py-2">
            <option value="">선택 안 함</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.price.toLocaleString("ko-KR")}원)
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>시작일</span>
          <AppDateInput
            name="subscriptionStartedAt"
            defaultValue={joinedDefault}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>종료일 (비우면 이용권 기간으로 계산)</span>
          <AppDateInput name="subscriptionEndsAt" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>결제 금액</span>
          <input
            name="paymentAmount"
            inputMode="numeric"
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>결제 수단</span>
          <select
            name="paymentMethod"
            className="w-full rounded-lg border px-3 py-2"
            defaultValue="cash"
          >
            <option value="cash">현금</option>
            <option value="card">카드</option>
            <option value="transfer">계좌이체</option>
            <option value="other">기타</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>결제 메모</span>
          <input
            name="paymentMemo"
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>
      </section>

      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={registerAsFighter}
            onChange={(e) => setRegisterAsFighter(e.target.checked)}
          />
          선수로 등록
        </label>
        {registerAsFighter ? (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">
              생년월일·성별이 필요합니다. 회원 정보를 그대로 사용합니다.
            </p>
            <label className="block space-y-1 text-sm">
              <span>키 (cm)</span>
              <input
                name="height"
                inputMode="decimal"
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>체중 (kg)</span>
              <input
                name="weight"
                inputMode="decimal"
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>주 종목 (선수)</span>
              <input
                name="fighterPrimarySport"
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
              />
              선수 로그인 계정 생성
            </label>
            {createLogin ? (
              <>
                <label className="block space-y-1 text-sm">
                  <span>로그인 아이디</span>
                  <input
                    name="loginId"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>초기 비밀번호 (비우면 자동 생성)</span>
                  <input
                    name="password"
                    type="password"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "회원 등록"}
        </Button>
        <Link
          href="/gym/members"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          취소
        </Link>
      </div>
    </form>
  );
}
