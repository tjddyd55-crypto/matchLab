"use client";

import { useEffect, useState, useTransition } from "react";
import { submitExternalRegistrationBatchAction } from "@/features/external-registration/actions";
import { EXTERNAL_REGISTRATION_MAX_ATHLETES } from "@/lib/validators/external-registration.validator";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApplicationWeightAutoAssign } from "@/components/domain/applications/ApplicationWeightAutoAssign";
import { parseApplicationWeightKg } from "@/lib/applications/application-weight";
import {
  formatResolvedDivisionPreview,
  resolveEventDivisionByApplicationWeight,
} from "@/lib/applications/resolve-event-division";
import { AthleteInsuranceProfileFields } from "@/components/domain/applications/AthleteInsuranceProfileFields";
import type { StructuredRecordValue } from "@/components/domain/applications/AthleteInsuranceProfileFields";
import { ExternalRegistrationStatusScreen } from "@/components/domain/applications/ExternalRegistrationStatusScreen";
import {
  INSURANCE_PII_CONSENT_CHECKBOX_LABEL,
} from "@/lib/athlete-application/insurance-consent";
import { parseResidentRegistrationNumber } from "@/lib/athlete-application/resident-registration-number";

type DivisionOption = {
  id: string;
  label: string;
  gender: string | null;
  ageGroup: string | null;
  sportType: string | null;
  weightClass: string | null;
  weightClassName: string | null;
  weightLimitText: string | null;
};

type AthleteDraft = {
  key: string;
  fighterName: string;
  gender: string;
  birthDate: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  competitionCategory: string;
  discipline: string;
  applicationWeightKg: string;
  memo: string;
  structuredRecord: StructuredRecordValue;
  careerText: string;
  residentRegistrationNumber: string;
  insuranceConsentAgreed: boolean;
};

type GymDraft = {
  gymName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  memo: string;
};

type Props = {
  token: string;
  eventTitle: string;
  eventDateLabel: string;
  locationLabel: string;
  registrationEndLabel: string;
  closedReason: string | null;
  divisions: DivisionOption[];
};

const fieldClass =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm";
const labelClass = "text-muted-foreground mb-1 block text-xs font-medium";

function newKey() {
  return `a-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyAthlete(): AthleteDraft {
  return {
    key: newKey(),
    fighterName: "",
    gender: "male",
    birthDate: "",
    phone: "",
    guardianName: "",
    guardianPhone: "",
    competitionCategory: "",
    discipline: "",
    applicationWeightKg: "",
    memo: "",
    structuredRecord: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
    careerText: "",
    residentRegistrationNumber: "",
    insuranceConsentAgreed: false,
  };
}

const DRAFT_PREFIX = "matchon-ext-reg:";

export function ExternalRegistrationPublicForm({
  token,
  eventTitle,
  eventDateLabel,
  locationLabel,
  registrationEndLabel,
  closedReason,
  divisions,
}: Props) {
  const [gym, setGym] = useState<GymDraft>({
    gymName: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    memo: "",
  });
  const [athletes, setAthletes] = useState<AthleteDraft[]>([emptyAthlete()]);
  const [step, setStep] = useState<"edit" | "review" | "success">("edit");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<{
    gymName: string;
    athleteCount: number;
    names: string[];
  } | null>(null);
  const [clientSubmissionId, setClientSubmissionId] = useState(() =>
    crypto.randomUUID(),
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_PREFIX + token);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { gym?: GymDraft; athletes?: AthleteDraft[] };
      if (parsed.gym) setGym(parsed.gym);
      if (parsed.athletes?.length) {
        setAthletes(
          parsed.athletes.map((a) => ({
            ...emptyAthlete(),
            ...a,
            residentRegistrationNumber: "",
            insuranceConsentAgreed: false,
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (step === "success") return;
    try {
      sessionStorage.setItem(
        DRAFT_PREFIX + token,
        JSON.stringify({
          gym,
          athletes: athletes.map((a) => ({
            ...a,
            residentRegistrationNumber: "",
            insuranceConsentAgreed: false,
          })),
        }),
      );
    } catch {
      /* ignore */
    }
  }, [token, gym, athletes, step]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === "success") return;
      if (!gym.gymName && athletes.every((a) => !a.fighterName)) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [gym, athletes, step]);

  function resolvedFor(a: AthleteDraft) {
    const gender = a.gender === "female" ? "female" : "male";
    const weight = parseApplicationWeightKg(a.applicationWeightKg);
    if (!weight.ok || !a.competitionCategory) return null;
    return resolveEventDivisionByApplicationWeight({
      gender,
      competitionCategory: a.competitionCategory,
      discipline: a.discipline,
      applicationWeightKg: weight.kg,
      divisions,
    });
  }

  function updateAthlete(key: string, patch: Partial<AthleteDraft>) {
    setAthletes((prev) =>
      prev.map((a) => (a.key === key ? { ...a, ...patch } : a)),
    );
  }

  function addAthlete() {
    if (athletes.length >= EXTERNAL_REGISTRATION_MAX_ATHLETES) return;
    const next = emptyAthlete();
    setAthletes((prev) => [...prev, next]);
    requestAnimationFrame(() => {
      document
        .getElementById(`athlete-${next.key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function removeAthlete(key: string) {
    setAthletes((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.key !== key)));
  }

  function copyAthlete(key: string) {
    if (athletes.length >= EXTERNAL_REGISTRATION_MAX_ATHLETES) return;
    const src = athletes.find((a) => a.key === key);
    if (!src) return;
    const next: AthleteDraft = {
      ...src,
      key: newKey(),
      fighterName: "",
      birthDate: "",
      phone: "",
      guardianName: "",
      guardianPhone: "",
      memo: "",
      residentRegistrationNumber: "",
      insuranceConsentAgreed: false,
    };
    setAthletes((prev) => {
      const idx = prev.findIndex((a) => a.key === key);
      const copy = [...prev];
      copy.splice(idx + 1, 0, next);
      return copy;
    });
  }

  function validateEdit(): string | null {
    if (!gym.gymName.trim()) return "체육관명을 입력해 주세요.";
    if (!gym.contactName.trim()) return "담당자명을 입력해 주세요.";
    if (!gym.contactPhone.trim()) return "연락처를 입력해 주세요.";
    for (let i = 0; i < athletes.length; i += 1) {
      const a = athletes[i]!;
      if (!a.fighterName.trim()) return `${i + 1}번 선수: 이름을 입력해 주세요.`;
      if (!a.gender) return `${i + 1}번 선수: 성별을 선택해 주세요.`;
      if (!a.birthDate) return `${i + 1}번 선수: 생년월일을 입력해 주세요.`;
      if (!a.competitionCategory || !a.applicationWeightKg) {
        return `${i + 1}번 선수: 경기구분과 신청체중을 입력해 주세요.`;
      }
      const resolved = resolvedFor(a);
      if (!resolved?.ok) {
        return `${i + 1}번 선수: ${resolved && !resolved.ok ? resolved.reason : "체급 자동배정이 필요합니다."}`;
      }
      const rrn = parseResidentRegistrationNumber(a.residentRegistrationNumber);
      if (!rrn.ok) return `${i + 1}번 선수: ${rrn.error}`;
      if (!a.insuranceConsentAgreed) {
        return `${i + 1}번 선수: 보험가입 개인정보 동의가 필요합니다.`;
      }
    }
    return null;
  }

  function goReview() {
    const msg = validateEdit();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setStep("review");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitExternalRegistrationBatchAction({
        token,
        clientSubmissionId,
        gymInfo: gym,
        athletes: athletes.map((a) => ({
          fighterName: a.fighterName,
          gender: a.gender,
          birthDate: a.birthDate,
          phone: a.phone || undefined,
          guardianName: a.guardianName || undefined,
          guardianPhone: a.guardianPhone || undefined,
          competitionCategory: a.competitionCategory,
          discipline: a.discipline || undefined,
          applicationWeightKg: Number(a.applicationWeightKg),
          memo: a.memo || undefined,
          totalBoutsSnapshot: a.structuredRecord.totalBouts,
          winsSnapshot: a.structuredRecord.wins,
          drawsSnapshot: a.structuredRecord.draws,
          lossesSnapshot: a.structuredRecord.losses,
          careerText: a.careerText || undefined,
          residentRegistrationNumber: a.residentRegistrationNumber,
          insuranceConsentAgreed: a.insuranceConsentAgreed,
        })),
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setSuccess({
        gymName: res.data.gymName,
        athleteCount: res.data.athleteCount,
        names: athletes.map((a) => a.fighterName),
      });
      setStep("success");
      try {
        sessionStorage.removeItem(DRAFT_PREFIX + token);
      } catch {
        /* ignore */
      }
    });
  }

  function registerMore() {
    setAthletes([emptyAthlete()]);
    setClientSubmissionId(crypto.randomUUID());
    setSuccess(null);
    setStep("edit");
    setError(null);
  }

  if (closedReason) {
    return (
      <ExternalRegistrationStatusScreen
        eventTitle={eventTitle}
        title="선수 등록을 할 수 없습니다"
        description={closedReason}
      />
    );
  }

  if (step === "success" && success) {
    return (
      <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
        <h2 className="text-lg font-semibold">선수 신청이 완료되었습니다.</h2>
        <p className="text-sm">
          {success.gymName} · 총 {success.athleteCount}명
        </p>
        <ul className="space-y-1 text-sm">
          {success.names.map((n) => (
            <li key={n} className="flex justify-between gap-2 border-b py-1">
              <span>{n}</span>
              <span className="text-muted-foreground">접수완료</span>
            </li>
          ))}
        </ul>
        <Button type="button" onClick={registerMore}>
          추가 선수 등록
        </Button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/10 p-4">
          <h2 className="font-semibold">신청 선수 {athletes.length}명</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            체육관: {gym.gymName} · 담당 {gym.contactName}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {athletes.map((a) => (
              <li key={a.key} className="flex justify-between gap-2 border-b py-1.5">
                <span className="font-medium">{a.fighterName}</span>
                <span className="text-muted-foreground text-right text-xs">
                  {(() => {
                    const resolved = resolvedFor(a);
                    return resolved?.ok
                      ? formatResolvedDivisionPreview(resolved.division)
                      : "체급 미배정";
                  })()}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setStep("edit")}
          >
            수정
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? "신청 중…" : `${athletes.length}명 신청 완료`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {eventTitle}
        </h1>
        <p className="text-sm font-medium">외부 체육관 선수 등록</p>
        <p className="text-muted-foreground text-sm">
          {eventDateLabel}
          {locationLabel ? ` · ${locationLabel}` : ""}
        </p>
        <p className="text-sm">신청마감 {registrationEndLabel}</p>
        <p className="text-muted-foreground pt-1 text-sm leading-relaxed">
          외부 체육관은 회원가입 없이 참가 선수를 여러 명 등록할 수 있습니다.
          체육관 정보를 입력하고 출전 선수를 추가해 주세요.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border bg-muted/10 p-3">
        <h2 className="text-sm font-semibold">체육관 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className={labelClass}>체육관명 *</span>
            <input
              className={fieldClass}
              value={gym.gymName}
              maxLength={120}
              onChange={(e) => setGym((g) => ({ ...g, gymName: e.target.value }))}
            />
          </label>
          <label className="block text-xs">
            <span className={labelClass}>담당자명 *</span>
            <input
              className={fieldClass}
              value={gym.contactName}
              maxLength={80}
              onChange={(e) =>
                setGym((g) => ({ ...g, contactName: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs">
            <span className={labelClass}>연락처 *</span>
            <input
              className={fieldClass}
              value={gym.contactPhone}
              maxLength={20}
              onChange={(e) =>
                setGym((g) => ({ ...g, contactPhone: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs">
            <span className={labelClass}>이메일</span>
            <input
              className={fieldClass}
              value={gym.contactEmail}
              maxLength={120}
              onChange={(e) =>
                setGym((g) => ({ ...g, contactEmail: e.target.value }))
              }
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">선수 목록</h2>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={athletes.length >= EXTERNAL_REGISTRATION_MAX_ATHLETES}
            onClick={addAthlete}
          >
            + 선수 추가
          </Button>
        </div>

        {athletes.map((a, idx) => (
          <div
            key={a.key}
            id={`athlete-${a.key}`}
            className="space-y-3 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                선수 {idx + 1}
                {a.fighterName ? ` · ${a.fighterName}` : ""}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => copyAthlete(a.key)}
                >
                  복사
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={athletes.length <= 1}
                  onClick={() => removeAthlete(a.key)}
                >
                  삭제
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs">
                <span className={labelClass}>이름 *</span>
                <input
                  className={fieldClass}
                  value={a.fighterName}
                  onChange={(e) =>
                    updateAthlete(a.key, { fighterName: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                <span className={labelClass}>성별 *</span>
                <select
                  className={fieldClass}
                  value={a.gender}
                  onChange={(e) =>
                    updateAthlete(a.key, {
                      gender: e.target.value,
                    })
                  }
                >
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className={labelClass}>생년월일 *</span>
                <AppDateInput
                  name={`birthDate-${a.key}`}
                  inputClassName={fieldClass}
                  value={a.birthDate}
                  onValueChange={(v) => updateAthlete(a.key, { birthDate: v })}
                  aria-label={`${idx + 1}번 선수 생년월일`}
                />
              </label>
              <label className="block text-xs">
                <span className={labelClass}>연락처</span>
                <input
                  className={fieldClass}
                  value={a.phone}
                  onChange={(e) =>
                    updateAthlete(a.key, { phone: e.target.value })
                  }
                />
              </label>
              <div className="sm:col-span-2 min-w-0">
                <ApplicationWeightAutoAssign
                  divisions={divisions}
                  gender={a.gender === "female" ? "female" : "male"}
                  competitionCategory={a.competitionCategory}
                  discipline={a.discipline}
                  applicationWeightKg={a.applicationWeightKg}
                  onCompetitionCategoryChange={(competitionCategory) =>
                    updateAthlete(a.key, { competitionCategory })
                  }
                  onDisciplineChange={(discipline) =>
                    updateAthlete(a.key, { discipline })
                  }
                  onApplicationWeightChange={(applicationWeightKg) =>
                    updateAthlete(a.key, { applicationWeightKg })
                  }
                  fieldClass={fieldClass}
                  labelClass={labelClass}
                />
              </div>
            </div>
            <AthleteInsuranceProfileFields
              idPrefix={`ext-${a.key}`}
              recordValue={a.structuredRecord}
              careerValue={a.careerText}
              rrnValue={a.residentRegistrationNumber}
              onRecordChange={(v) => updateAthlete(a.key, { structuredRecord: v })}
              onCareerChange={(v) => updateAthlete(a.key, { careerText: v })}
              onRrnChange={(v) =>
                updateAthlete(a.key, { residentRegistrationNumber: v })
              }
            />
            <label className="flex cursor-pointer gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-5 accent-primary"
                checked={a.insuranceConsentAgreed}
                onChange={(e) =>
                  updateAthlete(a.key, {
                    insuranceConsentAgreed: e.target.checked,
                  })
                }
              />
              {INSURANCE_PII_CONSENT_CHECKBOX_LABEL}
            </label>
          </div>
        ))}
      </section>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          "sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <Button type="button" className="w-full sm:w-auto" onClick={goReview}>
          {athletes.length}명 신청하기
        </Button>
      </div>
    </div>
  );
}
