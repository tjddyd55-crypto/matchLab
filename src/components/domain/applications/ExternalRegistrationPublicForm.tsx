"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { submitExternalRegistrationBatchAction } from "@/features/external-registration/actions";
import { EXTERNAL_REGISTRATION_MAX_ATHLETES } from "@/lib/validators/external-registration.validator";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  StructuredRecordFields,
  type StructuredRecordValue,
} from "@/components/domain/fighters/StructuredRecordFields";
import { ExternalRegistrationStatusScreen } from "@/components/domain/applications/ExternalRegistrationStatusScreen";
import {
  formControlFieldClass,
  formControlLabelClass,
  formControlTextareaClass,
} from "@/lib/ui/form-control-ui";
import { DIVISION_SELECTION_OTHER_LABEL } from "@/lib/applications/division-selection";
import { formatDivisionWeightChipLabel } from "@/lib/event-division-fields";
import { isMinorBirthDate } from "@/lib/gym-member-self-registration/age";
import { birthDateToUtc, parseApplicantGender } from "@/lib/applicant-excel/normalize";

const OTHER_OPTION_VALUE = "__OTHER__";

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
  gender: "" | "male" | "female";
  birthDate: string;
  phone: string;
  guardianPhone: string;
  competitionCategory: string;
  /** EventDivision.id 또는 OTHER_OPTION_VALUE */
  divisionOptionValue: string;
  otherDetailText: string;
  applicationWeightKg: string;
  memo: string;
  structuredRecord: StructuredRecordValue;
  careerText: string;
};

type GymDraft = {
  gymName: string;
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

const labelClass = cn(formControlLabelClass, "mb-1 block text-xs font-medium");

function newKey() {
  return `a-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyAthlete(): AthleteDraft {
  return {
    key: newKey(),
    fighterName: "",
    gender: "",
    birthDate: "",
    phone: "",
    guardianPhone: "",
    competitionCategory: "",
    divisionOptionValue: "",
    otherDetailText: "",
    applicationWeightKg: "",
    memo: "",
    structuredRecord: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
    careerText: "",
  };
}

function divisionMatchesGender(
  divisionGender: string | null,
  athleteGender: "male" | "female",
): boolean {
  const raw = (divisionGender ?? "").trim();
  if (!raw) return true;
  const folded = raw.toLowerCase();
  if (folded === "mixed" || raw === "혼성") return true;
  const parsed = parseApplicantGender(raw);
  return parsed.ok && parsed.gender === athleteGender;
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const t = (v ?? "").trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

function athleteIsMinor(birthDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  try {
    return isMinorBirthDate(birthDateToUtc(birthDate));
  } catch {
    return false;
  }
}

function divisionWeightLabel(d: DivisionOption): string {
  return (
    formatDivisionWeightChipLabel(d) ||
    d.weightClassName?.trim() ||
    d.weightClass?.trim() ||
    d.label
  );
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
  const [gym, setGym] = useState<GymDraft>({ gymName: "", memo: "" });
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
  const [formReady, setFormReady] = useState(false);

  useEffect(() => {
    setFormReady(true);
    try {
      const raw = sessionStorage.getItem(DRAFT_PREFIX + token);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        gym?: GymDraft;
        athletes?: AthleteDraft[];
      };
      if (parsed.gym?.gymName?.trim()) {
        setGym({
          gymName: parsed.gym.gymName,
          memo: parsed.gym.memo ?? "",
        });
      }
      if (parsed.athletes?.some((a) => a.fighterName?.trim())) {
        setAthletes(
          parsed.athletes.map((a) => ({
            ...emptyAthlete(),
            ...a,
            gender:
              a.gender === "female" || a.gender === "male" ? a.gender : "",
            divisionOptionValue: a.divisionOptionValue ?? "",
            otherDetailText: a.otherDetailText ?? "",
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (step === "success") return;
    if (!gym.gymName.trim() && athletes.every((a) => !a.fighterName.trim())) {
      return;
    }
    try {
      sessionStorage.setItem(
        DRAFT_PREFIX + token,
        JSON.stringify({ gym, athletes }),
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

  function updateAthlete(key: string, patch: Partial<AthleteDraft>) {
    setAthletes((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a;
        const next = { ...a, ...patch };
        if (patch.gender !== undefined && patch.gender !== a.gender) {
          next.competitionCategory = "";
          next.divisionOptionValue = "";
          next.otherDetailText = "";
        }
        if (
          patch.competitionCategory !== undefined &&
          patch.competitionCategory !== a.competitionCategory
        ) {
          next.divisionOptionValue = "";
          next.otherDetailText = "";
        }
        return next;
      }),
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
    setAthletes((prev) =>
      prev.length <= 1 ? prev : prev.filter((a) => a.key !== key),
    );
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
      guardianPhone: "",
      memo: "",
    };
    setAthletes((prev) => {
      const idx = prev.findIndex((a) => a.key === key);
      const copy = [...prev];
      copy.splice(idx + 1, 0, next);
      return copy;
    });
  }

  function buildDivisionSelection(a: AthleteDraft) {
    if (a.divisionOptionValue === OTHER_OPTION_VALUE) {
      return {
        selectionType: "OTHER" as const,
        requestedDivisionText: a.otherDetailText.trim(),
      };
    }
    return {
      selectionType: "REGISTERED" as const,
      divisionId: a.divisionOptionValue,
    };
  }

  function divisionPreviewLabel(a: AthleteDraft): string {
    if (a.divisionOptionValue === OTHER_OPTION_VALUE) {
      const detail = a.otherDetailText.trim();
      return detail
        ? `${DIVISION_SELECTION_OTHER_LABEL} · ${detail}`
        : DIVISION_SELECTION_OTHER_LABEL;
    }
    const d = divisions.find((x) => x.id === a.divisionOptionValue);
    return d?.label ?? "체급 미선택";
  }

  function validateEdit(): string | null {
    if (!gym.gymName.trim()) return "체육관명을 입력해 주세요.";
    for (let i = 0; i < athletes.length; i += 1) {
      const a = athletes[i]!;
      const prefix = `${i + 1}번 선수`;
      if (!a.fighterName.trim()) return `${prefix}: 이름을 입력해 주세요.`;
      if (!a.gender) return `${prefix}: 성별을 선택해 주세요.`;
      if (!a.birthDate) return `${prefix}: 생년월일을 입력해 주세요.`;
      if (!a.phone.trim()) return `${prefix}: 연락처를 입력해 주세요.`;
      if (athleteIsMinor(a.birthDate) && !a.guardianPhone.trim()) {
        return `${prefix}: 미성년자는 보호자 연락처가 필요합니다.`;
      }
      if (!a.competitionCategory.trim()) {
        return `${prefix}: 경기구분을 선택해 주세요.`;
      }
      if (!a.divisionOptionValue) return `${prefix}: 체급을 선택해 주세요.`;
      if (
        a.divisionOptionValue === OTHER_OPTION_VALUE &&
        !a.otherDetailText.trim()
      ) {
        return `${prefix}: 기타를 선택한 경우 체급 또는 요청사항을 입력해주세요.`;
      }
      const r = a.structuredRecord;
      if (r.totalBouts !== r.wins + r.draws + r.losses) {
        return `${prefix}: 총 경기수와 승·무·패 합계가 일치하지 않습니다.`;
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
        gymInfo: {
          gymName: gym.gymName,
          memo: gym.memo || undefined,
          contactName: athletes[0]?.fighterName?.trim() || undefined,
          contactPhone: athletes[0]?.phone?.trim() || undefined,
        },
        athletes: athletes.map((a) => ({
          fighterName: a.fighterName,
          gender: a.gender,
          birthDate: a.birthDate,
          phone: a.phone,
          guardianPhone: a.guardianPhone || undefined,
          competitionCategory: a.competitionCategory,
          divisionSelection: buildDivisionSelection(a),
          applicationWeightKg: a.applicationWeightKg || undefined,
          memo: a.memo || undefined,
          structuredRecord: a.structuredRecord,
          careerText: a.careerText || undefined,
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
        <h2 className="text-lg font-semibold">신청이 완료되었습니다.</h2>
        <p className="text-sm">
          {success.gymName} · 총 {success.athleteCount}명
        </p>
        <ul className="space-y-1 text-sm">
          {success.names.map((n, i) => (
            <li
              key={`${n}-${i}`}
              className="flex justify-between gap-2 border-b py-1"
            >
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
            체육관: {gym.gymName}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {athletes.map((a) => (
              <li
                key={a.key}
                className="flex justify-between gap-2 border-b py-1.5"
              >
                <span className="font-medium">{a.fighterName}</span>
                <span className="text-muted-foreground text-right text-xs">
                  {a.competitionCategory} · {divisionPreviewLabel(a)}
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
    <div className="space-y-5" data-ext-form-ready={formReady ? "true" : "false"}>
      <header className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {eventTitle}
        </h1>
        <p className="text-sm font-medium">선수 참가 신청</p>
        <p className="text-muted-foreground text-sm">
          {eventDateLabel}
          {locationLabel ? ` · ${locationLabel}` : ""}
        </p>
        <p className="text-sm">신청마감 {registrationEndLabel}</p>
        <p className="text-muted-foreground pt-1 text-sm leading-relaxed">
          회원가입 없이 1차 참가 신청을 할 수 있습니다. 주민등록번호·보험
          동의·서명은 추후 별도 요청합니다.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border bg-muted/10 p-3">
        <h2 className="text-sm font-semibold">체육관 정보</h2>
        <label className="block text-xs" htmlFor="ext-gym-name">
          <span className={labelClass}>체육관명 *</span>
          <input
            id="ext-gym-name"
            className={formControlFieldClass}
            value={gym.gymName}
            maxLength={120}
            onChange={(e) => setGym((g) => ({ ...g, gymName: e.target.value }))}
          />
        </label>
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
          <AthleteCard
            key={a.key}
            athlete={a}
            index={idx}
            divisions={divisions}
            canRemove={athletes.length > 1}
            onUpdate={(patch) => updateAthlete(a.key, patch)}
            onCopy={() => copyAthlete(a.key)}
            onRemove={() => removeAthlete(a.key)}
          />
        ))}
      </section>

      <section className="space-y-2">
        <label className="block text-xs" htmlFor="ext-gym-memo">
          <span className={labelClass}>메모 (선택)</span>
          <textarea
            id="ext-gym-memo"
            className={formControlTextareaClass}
            value={gym.memo}
            maxLength={2000}
            onChange={(e) => setGym((g) => ({ ...g, memo: e.target.value }))}
          />
        </label>
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

function AthleteCard({
  athlete: a,
  index: idx,
  divisions,
  canRemove,
  onUpdate,
  onCopy,
  onRemove,
}: {
  athlete: AthleteDraft;
  index: number;
  divisions: DivisionOption[];
  canRemove: boolean;
  onUpdate: (patch: Partial<AthleteDraft>) => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const gender = a.gender === "female" || a.gender === "male" ? a.gender : null;
  const isMinor = athleteIsMinor(a.birthDate);
  const isOther = a.divisionOptionValue === OTHER_OPTION_VALUE;

  const genderFiltered = useMemo(() => {
    if (!gender) return [];
    return divisions.filter((d) => divisionMatchesGender(d.gender, gender));
  }, [divisions, gender]);

  const ageGroupOptions = useMemo(
    () => uniqueSorted(genderFiltered.map((d) => d.ageGroup)),
    [genderFiltered],
  );

  const weightOptions = useMemo(() => {
    if (!a.competitionCategory.trim()) return [];
    return genderFiltered.filter(
      (d) => (d.ageGroup ?? "").trim() === a.competitionCategory.trim(),
    );
  }, [genderFiltered, a.competitionCategory]);

  return (
    <div
      id={`athlete-${a.key}`}
      className="space-y-3 rounded-lg border p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          선수 {idx + 1}
          {a.fighterName ? ` · ${a.fighterName}` : ""}
        </p>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={onCopy}>
            복사
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!canRemove}
            onClick={onRemove}
          >
            삭제
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs">
          <span className={labelClass}>선수명 *</span>
          <input
            className={formControlFieldClass}
            value={a.fighterName}
            onChange={(e) => onUpdate({ fighterName: e.target.value })}
          />
        </label>
        <label className="block text-xs">
          <span className={labelClass}>성별 *</span>
          <select
            className={formControlFieldClass}
            value={a.gender}
            onChange={(e) =>
              onUpdate({
                gender: e.target.value as AthleteDraft["gender"],
              })
            }
          >
            <option value="" disabled>
              선택
            </option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </label>
        <label className="block text-xs">
          <span className={labelClass}>생년월일 *</span>
          <AppDateInput
            name={`birthDate-${a.key}`}
            inputClassName={formControlFieldClass}
            value={a.birthDate}
            onValueChange={(v) => onUpdate({ birthDate: v })}
            aria-label={`${idx + 1}번 선수 생년월일`}
          />
        </label>
        <label className="block text-xs">
          <span className={labelClass}>선수 연락처 *</span>
          <input
            className={formControlFieldClass}
            value={a.phone}
            inputMode="tel"
            maxLength={20}
            onChange={(e) => onUpdate({ phone: e.target.value })}
          />
        </label>
        {isMinor ? (
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs">
              <span className={labelClass}>보호자 연락처 *</span>
              <input
                className={formControlFieldClass}
                value={a.guardianPhone}
                inputMode="tel"
                maxLength={20}
                onChange={(e) => onUpdate({ guardianPhone: e.target.value })}
              />
            </label>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              미성년 선수의 추가정보 입력 요청은 보호자에게 발송됩니다.
            </p>
          </div>
        ) : null}

        <label className="block text-xs">
          <span className={labelClass}>경기구분 *</span>
          <select
            className={formControlFieldClass}
            value={a.competitionCategory}
            disabled={!gender}
            onChange={(e) =>
              onUpdate({ competitionCategory: e.target.value })
            }
          >
            <option value="" disabled>
              {gender ? "선택" : "성별을 먼저 선택"}
            </option>
            {ageGroupOptions.map((ageGroup) => (
              <option key={ageGroup} value={ageGroup}>
                {ageGroup}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs">
          <span className={labelClass}>체급 *</span>
          <select
            className={formControlFieldClass}
            value={a.divisionOptionValue}
            disabled={!a.competitionCategory}
            onChange={(e) => {
              const value = e.target.value;
              onUpdate({
                divisionOptionValue: value,
                otherDetailText:
                  value === OTHER_OPTION_VALUE ? a.otherDetailText : "",
              });
            }}
          >
            <option value="" disabled>
              {a.competitionCategory ? "선택" : "경기구분을 먼저 선택"}
            </option>
            {weightOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {divisionWeightLabel(d)}
              </option>
            ))}
            <option value={OTHER_OPTION_VALUE}>
              {DIVISION_SELECTION_OTHER_LABEL}
            </option>
          </select>
        </label>

        {isOther ? (
          <label className="block text-xs sm:col-span-2 lg:col-span-3">
            <span className={labelClass}>기타 내용 *</span>
            <textarea
              className={formControlTextareaClass}
              value={a.otherDetailText}
              maxLength={500}
              placeholder="희망 체급 또는 요청사항을 입력해 주세요."
              onChange={(e) => onUpdate({ otherDetailText: e.target.value })}
            />
          </label>
        ) : null}

        <label className="block text-xs">
          <span className={labelClass}>신청체중 (선택)</span>
          <input
            className={formControlFieldClass}
            value={a.applicationWeightKg}
            inputMode="decimal"
            placeholder="kg"
            onChange={(e) => onUpdate({ applicationWeightKg: e.target.value })}
          />
        </label>

        <label className="block text-xs sm:col-span-2">
          <span className={labelClass}>운동경력 (선택)</span>
          <input
            className={formControlFieldClass}
            value={a.careerText}
            maxLength={200}
            onChange={(e) => onUpdate({ careerText: e.target.value })}
          />
        </label>

        <label className="block text-xs sm:col-span-2 lg:col-span-3">
          <span className={labelClass}>선수 메모 (선택)</span>
          <textarea
            className={formControlTextareaClass}
            value={a.memo}
            maxLength={2000}
            onChange={(e) => onUpdate({ memo: e.target.value })}
          />
        </label>
      </div>

      <StructuredRecordFields
        idPrefix={`ext-record-${a.key}`}
        value={a.structuredRecord}
        onChange={(structuredRecord) => onUpdate({ structuredRecord })}
      />
    </div>
  );
}
