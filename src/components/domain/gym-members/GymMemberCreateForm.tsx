"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GymMemberCommonInfoSection } from "@/components/domain/gym-members/GymMemberCommonInfoSection";
import {
  GymMemberCustomProfileSection,
  GymMemberSportProfileSection,
} from "@/components/domain/gym-members/GymMemberProfileSections";
import {
  GymMemberFormShell,
  GymMemberStickyActionBar,
} from "@/components/domain/gym-members/GymMemberFormLayout";
import { GymMemberProfileImageUpload } from "@/components/domain/gym-members/GymMemberProfileImageUpload";
import { AppDateInput } from "@/components/shared/AppDateInput";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";
import { createGymMemberAction } from "@/features/gym-members/actions";
import {
  todayUtcDateOnlyString,
  formatUtcDateOnly,
} from "@/lib/date-only";
import { addMembershipDuration } from "@/lib/gym-member/membership-duration";
import { GymMembershipDurationType } from "@/lib/enums";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phone";

type PlanOption = {
  id: string;
  name: string;
  price: number;
  durationType: GymMembershipDurationType;
  durationValue: number | null;
};

type GroupOption = { id: string; name: string };

type DuplicateCandidate = {
  id: string;
  memberNumber: string;
  name: string;
  phone: string;
  birthDate: Date | string | null;
};

function toYmd(d: Date | null): string {
  if (!d) return "";
  return formatUtcDateOnly(d, "-");
}

export function GymMemberCreateForm({
  plans,
  groups = [],
  defaultRegisterAsFighter = false,
  sportTemplate = null,
  customFields = [],
}: {
  plans: PlanOption[];
  groups?: GroupOption[];
  defaultRegisterAsFighter?: boolean;
  sportTemplate?: MemberSportTemplateWithFields | null;
  customFields?: GymMemberDynamicFieldDefinition[];
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
  const [profileImagePath, setProfileImagePath] = useState("");
  const [planId, setPlanId] = useState("");
  const [subscriptionStartedAt, setSubscriptionStartedAt] = useState(
    () => todayUtcDateOnlyString(),
  );
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [lockerEnabled, setLockerEnabled] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const joinedDefault = useMemo(() => todayUtcDateOnlyString(), []);

  function applyPlanAutofill(nextPlanId: string, startedAt: string) {
    setPlanId(nextPlanId);
    if (!nextPlanId) {
      setPaymentAmount("");
      setSubscriptionEndsAt("");
      return;
    }
    const plan = plans.find((p) => p.id === nextPlanId);
    if (!plan) return;
    setPaymentAmount(String(plan.price));
    const start = startedAt ? new Date(`${startedAt}T00:00:00.000Z`) : null;
    if (!start || Number.isNaN(start.getTime())) return;
    const ends = addMembershipDuration(
      start,
      plan.durationType,
      plan.durationValue,
    );
    setSubscriptionEndsAt(toYmd(ends));
  }

  function toggleGroup(id: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit(formData: FormData) {
    setError(null);
    if (confirmDuplicate) formData.set("confirmDuplicate", "true");
    formData.set("registerAsFighter", registerAsFighter ? "true" : "false");
    formData.set("createLoginAccount", createLogin ? "true" : "false");
    formData.set("lockerEnabled", lockerEnabled ? "true" : "false");
    formData.set("smsOptOut", formData.get("smsOptOut") === "true" ? "true" : "false");
    for (const gid of selectedGroupIds) formData.append("groupIds", gid);

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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-0"
    >
      <GymMemberFormShell>
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

      <GymMemberProfileImageUpload
        memberId={null}
        initialImageUrl={null}
        imagePath={profileImagePath}
        onImagePathChange={setProfileImagePath}
      />
      {profileImagePath ? (
        <input type="hidden" name="profileImagePath" value={profileImagePath} />
      ) : null}

      <GymMemberCommonInfoSection
        initial={{ joinedAt: joinedDefault }}
        joinedRequired
      />

      {groups.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-matchon-border p-3">
          <h3 className="text-sm font-semibold">회원 그룹</h3>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <label
                key={g.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-matchon-border px-2.5 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                />
                {g.name}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {sportTemplate ? (
        <GymMemberSportProfileSection template={sportTemplate} />
      ) : null}

      <GymMemberCustomProfileSection fields={customFields} />

      <section className="space-y-3 border-t border-matchon-border pt-4">
        <h2 className="text-base font-semibold">이용권·결제 (선택)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>이용권</span>
            <select
              name="planId"
              className={matchonFieldInputClass}
              value={planId}
              onChange={(e) =>
                applyPlanAutofill(e.target.value, subscriptionStartedAt)
              }
            >
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
              value={subscriptionStartedAt}
              onValueChange={(v) => {
                setSubscriptionStartedAt(v);
                if (planId) applyPlanAutofill(planId, v);
              }}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>종료일</span>
            <AppDateInput
              name="subscriptionEndsAt"
              value={subscriptionEndsAt}
              onValueChange={setSubscriptionEndsAt}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>결제 금액</span>
            <input
              name="paymentAmount"
              inputMode="numeric"
              className={matchonFieldInputClass}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>결제 수단</span>
            <select
              name="paymentMethod"
              className={matchonFieldInputClass}
              defaultValue="card"
            >
              <option value="cash">현금</option>
              <option value="card">카드</option>
              <option value="transfer">계좌이체</option>
              <option value="other">기타</option>
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={lockerEnabled}
            onChange={(e) => setLockerEnabled(e.target.checked)}
          />
          사물함 이용
        </label>
        {lockerEnabled ? (
          <div className="grid gap-3 rounded-xl border border-matchon-border p-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>사물함 번호 *</span>
              <input
                name="lockerLabel"
                required={lockerEnabled}
                className={matchonFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>금액</span>
              <input
                name="lockerAmount"
                inputMode="numeric"
                className={matchonFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>시작일</span>
              <AppDateInput
                name="lockerStartedAt"
                defaultValue={joinedDefault}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>종료일</span>
              <AppDateInput name="lockerEndsAt" />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span>사물함 메모</span>
              <input name="lockerMemo" className={matchonFieldInputClass} />
            </label>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-matchon-border pt-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={registerAsFighter}
            onChange={(e) => setRegisterAsFighter(e.target.checked)}
          />
          선수로 등록
        </label>
        {registerAsFighter ? (
          <div className="space-y-3 rounded-xl border p-4 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
            <p className="text-xs text-muted-foreground sm:col-span-2">
              생년월일·성별이 필요합니다. 회원 정보를 그대로 사용합니다.
            </p>
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
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
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
          </div>
        ) : null}
      </section>

      <GymMemberStickyActionBar pending={pending} submitLabel="회원 등록" />
      </GymMemberFormShell>
    </form>
  );
}
