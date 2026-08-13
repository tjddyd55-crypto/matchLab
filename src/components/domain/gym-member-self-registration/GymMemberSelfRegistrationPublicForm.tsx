"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type RefObject,
} from "react";
import { submitGymMemberSelfRegistrationAction } from "@/features/gym-member-self-registration/public-actions";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/shared/SignaturePad";
import { Button } from "@/components/ui/button";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import {
  GYM_MEMBER_SELF_REG_GENDER_LABELS,
  GYM_MEMBER_SELF_REG_TIME_BAND_LABELS,
  GYM_MEMBER_SELF_REG_TIME_BANDS,
  type GymMemberSelfRegTimeBand,
} from "@/lib/gym-member-self-registration/constants";
import {
  formatCompletedAgeLabel,
  isMinorBirthDate,
} from "@/lib/gym-member-self-registration/age";
import { parseDateOnlyString } from "@/lib/date-only";
import {
  EMPTY_HEALTH_SNAPSHOT,
  type HealthAnswer,
  type HealthSnapshot,
} from "@/lib/gym-member-self-registration/types";

type Terms = { title: string; version: number; content: string };

type Props = {
  token: string;
  gymName: string;
  terms: Terms;
};

type Step = 1 | 2 | 3 | 4;

function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyForm() {
  return {
    name: "",
    gender: "" as "" | "남" | "여",
    birthDate: "",
    phone: "",
    address: "",
    addressDetail: "",
    occupationOrSchool: "",
    guardianName: "",
    guardianPhone: "",
    preferredTimeBand: "" as "" | GymMemberSelfRegTimeBand,
    purposeText: "",
    experienceText: "",
    health: structuredClone(EMPTY_HEALTH_SNAPSHOT),
    privacyAgreed: false,
    termsAgreed: false,
    guardianConsentAgreed: false,
  };
}

export function GymMemberSelfRegistrationPublicForm({
  token,
  gymName,
  terms,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [formKey, setFormKey] = useState(0);
  const [clientSubmissionId, setClientSubmissionId] = useState(newClientId);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const memberPadRef = useRef<SignaturePadHandle | null>(null);
  const guardianPadRef = useRef<SignaturePadHandle | null>(null);
  const [memberSignatureBlob, setMemberSignatureBlob] = useState<Blob | null>(null);
  const [guardianSignatureBlob, setGuardianSignatureBlob] = useState<Blob | null>(null);

  const birth = parseDateOnlyString(form.birthDate);
  const minor = birth ? isMinorBirthDate(birth) : false;
  const ageLabel = birth ? formatCompletedAgeLabel(birth) : null;

  function resetAll() {
    setForm(emptyForm());
    setStep(1);
    setError(null);
    setDone(false);
    setClientSubmissionId(newClientId());
    setFormKey((k) => k + 1);
    setMemberSignatureBlob(null);
    setGuardianSignatureBlob(null);
    memberPadRef.current?.clear();
    guardianPadRef.current?.clear();
  }

  function validateStep(current: Step): string | null {
    if (current === 1) {
      if (!form.name.trim()) return "이름을 입력해 주세요.";
      if (!form.gender) return "성별을 선택해 주세요.";
      if (!birth) return "생년월일을 입력해 주세요.";
      if (!form.phone.trim()) return "연락처를 입력해 주세요.";
      if (minor && !form.guardianName.trim()) return "보호자 이름을 입력해 주세요.";
      if (minor && !form.guardianPhone.trim()) return "보호자 연락처를 입력해 주세요.";
    }
    if (current === 2) {
      const labels: Array<[keyof HealthSnapshot, string]> = [
        ["currentCondition", "현재 건강상 이상"],
        ["medicationOrDisease", "복용약/질환"],
        ["exerciseCaution", "운동 시 주의사항"],
        ["recentSurgeryOrHospital", "최근 수술/입원"],
      ];
      for (const [key, label] of labels) {
        const row = form.health[key];
        if (row.answer == null) return `${label}에 답해 주세요.`;
        if (row.answer && !row.detail.trim()) {
          return `${label} 상세 내용을 입력해 주세요.`;
        }
      }
    }
    if (current === 3) {
      if (!form.privacyAgreed) return "개인정보 수집·이용에 동의해 주세요.";
      if (!form.termsAgreed) return "이용 안내에 동의해 주세요.";
      if (memberPadRef.current?.isEmpty() !== false) {
        return "회원 서명을 입력해 주세요.";
      }
      if (minor && !form.guardianConsentAgreed) {
        return "보호자 동의가 필요합니다.";
      }
      if (minor && guardianPadRef.current?.isEmpty() !== false) {
        return "보호자 서명을 입력해 주세요.";
      }
    }
    return null;
  }

  async function captureSignatures(): Promise<string | null> {
    const memberBlob = await memberPadRef.current?.toBlob();
    if (!memberBlob || memberPadRef.current?.isEmpty()) {
      return "회원 서명을 입력해 주세요.";
    }
    setMemberSignatureBlob(memberBlob);
    if (!minor) {
      setGuardianSignatureBlob(null);
      return null;
    }
    const guardianBlob = await guardianPadRef.current?.toBlob();
    if (!guardianBlob || guardianPadRef.current?.isEmpty()) {
      return "보호자 서명을 입력해 주세요.";
    }
    setGuardianSignatureBlob(guardianBlob);
    return null;
  }

  async function goNext() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    if (step === 3) {
      const sigMsg = await captureSignatures();
      if (sigMsg) {
        setError(sigMsg);
        return;
      }
    }
    setError(null);
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  }

  function submit() {
    const msg = validateStep(1) ?? validateStep(2);
    if (msg) {
      setError(msg);
      return;
    }
    if (!form.privacyAgreed) {
      setError("개인정보 수집·이용에 동의해 주세요.");
      return;
    }
    if (!form.termsAgreed) {
      setError("이용 안내에 동의해 주세요.");
      return;
    }
    if (!memberSignatureBlob) {
      setError("회원 서명을 입력해 주세요.");
      return;
    }
    if (minor && !form.guardianConsentAgreed) {
      setError("보호자 동의가 필요합니다.");
      return;
    }
    if (minor && !guardianSignatureBlob) {
      setError("보호자 서명을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set(
        "payload",
        JSON.stringify({
          token,
          clientSubmissionId,
          name: form.name,
          gender: form.gender,
          birthDate: form.birthDate,
          phone: form.phone,
          address: form.address || undefined,
          addressDetail: form.addressDetail || undefined,
          occupationOrSchool: form.occupationOrSchool || undefined,
          guardianName: form.guardianName || undefined,
          guardianPhone: form.guardianPhone || undefined,
          preferredTimeBand: form.preferredTimeBand || undefined,
          purposeText: form.purposeText || undefined,
          experienceText: form.experienceText || undefined,
          health: form.health,
          privacyAgreed: true,
          termsAgreed: true,
          guardianConsentAgreed: minor ? true : undefined,
        }),
      );
      fd.set("memberSignature", memberSignatureBlob, "member.png");
      if (minor && guardianSignatureBlob) {
        fd.set("guardianSignature", guardianSignatureBlob, "guardian.png");
      }
      const result = await submitGymMemberSelfRegistrationAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setForm(emptyForm());
      setMemberSignatureBlob(null);
      setGuardianSignatureBlob(null);
      memberPadRef.current?.clear();
      guardianPadRef.current?.clear();
      setDone(true);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });
  }

  if (done) {
    return (
      <section className="mx-auto max-w-md space-y-5 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-matchon-primary">MATCHON</p>
        <h1 className="text-xl font-bold text-matchon-text-primary">
          회원 등록 신청이 완료되었습니다
        </h1>
        <p className="text-sm text-matchon-text-secondary">
          체육관에서 내용을 확인한 후 회원 등록이 완료됩니다.
        </p>
        <p className="text-sm font-medium text-matchon-text-primary">{gymName}</p>
        <Button type="button" className="min-h-11 w-full" onClick={resetAll}>
          새 회원 등록
        </Button>
      </section>
    );
  }

  return (
    <div key={formKey} className="mx-auto w-full max-w-md px-4 py-6">
      <header className="mb-5 space-y-1">
        <p className="text-xs font-semibold text-matchon-primary">MATCHON</p>
        <h1 className="text-lg font-bold text-matchon-text-primary">
          {gymName} 회원 등록
        </h1>
        <p className="text-sm text-matchon-text-secondary">
          회원정보를 작성해주세요. 작성 완료 후 체육관에서 확인합니다.
        </p>
        <p className="text-xs text-matchon-text-secondary">
          {step}/4 ·{" "}
          {step === 1
            ? "기본정보"
            : step === 2
              ? "건강·운동"
              : step === 3
                ? "동의·서명"
                : "확인"}
        </p>
      </header>

      {error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <BasicInfoStep
          form={form}
          ageLabel={ageLabel}
          minor={minor}
          onChange={setForm}
        />
      ) : null}
      {step === 2 ? <HealthStep form={form} onChange={setForm} /> : null}
      {step === 3 || step === 4 ? (
        <div className={step === 4 ? "hidden" : undefined}>
          <ConsentStep
            form={form}
            minor={minor}
            terms={terms}
            memberPadRef={memberPadRef}
            guardianPadRef={guardianPadRef}
            onChange={setForm}
          />
        </div>
      ) : null}
      {step === 4 ? (
        <ConfirmStep form={form} minor={minor} ageLabel={ageLabel} />
      ) : null}

      <div className="mt-6 flex gap-2">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1"
            onClick={() => {
              setError(null);
              setStep((s) => (s - 1) as Step);
            }}
          >
            이전
          </Button>
        ) : null}
        {step < 4 ? (
          <Button type="button" className="min-h-11 flex-1" onClick={goNext}>
            다음
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-11 flex-1"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "신청 중..." : "회원 등록 신청"}
          </Button>
        )}
      </div>
    </div>
  );
}

type FormState = ReturnType<typeof emptyForm>;

function BasicInfoStep({
  form,
  ageLabel,
  minor,
  onChange,
}: {
  form: FormState;
  ageLabel: string | null;
  minor: boolean;
  onChange: (next: FormState) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="이름 *">
        <input
          className={matchonFieldInputClass}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          autoComplete="name"
        />
      </Field>
      <Field label="성별 *">
        <div className="grid grid-cols-2 gap-2">
          {(["남", "여"] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={`min-h-11 rounded-lg border text-sm ${
                form.gender === g
                  ? "border-matchon-primary bg-matchon-primary/5 font-semibold"
                  : "border-matchon-border bg-white"
              }`}
              onClick={() => onChange({ ...form, gender: g })}
            >
              {GYM_MEMBER_SELF_REG_GENDER_LABELS[g]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="생년월일 *">
        <input
          type="date"
          className={matchonFieldInputClass}
          value={form.birthDate}
          onChange={(e) => onChange({ ...form, birthDate: e.target.value })}
        />
        {ageLabel ? (
          <p className="mt-1 text-xs text-matchon-text-secondary">{ageLabel}</p>
        ) : null}
      </Field>
      <Field label="연락처 *">
        <input
          inputMode="tel"
          className={matchonFieldInputClass}
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
          placeholder="010-1234-5678"
          autoComplete="tel"
        />
      </Field>
      <Field label="주소">
        <input
          className={matchonFieldInputClass}
          value={form.address}
          onChange={(e) => onChange({ ...form, address: e.target.value })}
          autoComplete="street-address"
        />
      </Field>
      <Field label="상세주소">
        <input
          className={matchonFieldInputClass}
          value={form.addressDetail}
          onChange={(e) => onChange({ ...form, addressDetail: e.target.value })}
        />
      </Field>
      <Field label="직업/학교">
        <input
          className={matchonFieldInputClass}
          value={form.occupationOrSchool}
          onChange={(e) =>
            onChange({ ...form, occupationOrSchool: e.target.value })
          }
        />
      </Field>
      {minor ? (
        <>
          <p className="pt-2 text-xs font-semibold text-matchon-text-primary">
            미성년자 보호자 정보
          </p>
          <Field label="보호자 이름 *">
            <input
              className={matchonFieldInputClass}
              value={form.guardianName}
              onChange={(e) => onChange({ ...form, guardianName: e.target.value })}
            />
          </Field>
          <Field label="보호자 연락처 *">
            <input
              inputMode="tel"
              className={matchonFieldInputClass}
              value={form.guardianPhone}
              onChange={(e) =>
                onChange({ ...form, guardianPhone: e.target.value })
              }
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}

function HealthStep({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
}) {
  function setHealth(key: keyof HealthSnapshot, next: HealthAnswer) {
    onChange({ ...form, health: { ...form.health, [key]: next } });
  }
  return (
    <div className="space-y-4">
      <Field label="운동 목적">
        <input
          className={matchonFieldInputClass}
          value={form.purposeText}
          onChange={(e) => onChange({ ...form, purposeText: e.target.value })}
          placeholder="체력, 취미, 대회 준비 등"
        />
      </Field>
      <Field label="희망 시간대">
        <select
          className={matchonFieldInputClass}
          value={form.preferredTimeBand}
          onChange={(e) =>
            onChange({
              ...form,
              preferredTimeBand: e.target.value as FormState["preferredTimeBand"],
            })
          }
        >
          <option value="">선택 안 함</option>
          {GYM_MEMBER_SELF_REG_TIME_BANDS.map((b) => (
            <option key={b} value={b}>
              {GYM_MEMBER_SELF_REG_TIME_BAND_LABELS[b]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="운동 경험 또는 경력">
        <textarea
          className={`${matchonFieldInputClass} h-24 py-2`}
          value={form.experienceText}
          onChange={(e) => onChange({ ...form, experienceText: e.target.value })}
          placeholder="킥복싱 1년 / 운동 경험 없음"
        />
      </Field>
      <HealthQuestion
        label="현재 건강상 이상이 있습니까?"
        value={form.health.currentCondition}
        onChange={(v) => setHealth("currentCondition", v)}
      />
      <HealthQuestion
        label="현재 복용 중인 약 또는 치료 중인 질환이 있습니까?"
        value={form.health.medicationOrDisease}
        onChange={(v) => setHealth("medicationOrDisease", v)}
      />
      <HealthQuestion
        label="운동 시 주의해야 할 사항이 있습니까?"
        value={form.health.exerciseCaution}
        onChange={(v) => setHealth("exerciseCaution", v)}
      />
      <HealthQuestion
        label="최근 6개월 내 수술 또는 입원 경험이 있습니까?"
        value={form.health.recentSurgeryOrHospital}
        onChange={(v) => setHealth("recentSurgeryOrHospital", v)}
      />
    </div>
  );
}

function ConsentStep({
  form,
  minor,
  terms,
  memberPadRef,
  guardianPadRef,
  onChange,
}: {
  form: FormState;
  minor: boolean;
  terms: Terms;
  memberPadRef: RefObject<SignaturePadHandle | null>;
  guardianPadRef: RefObject<SignaturePadHandle | null>;
  onChange: (next: FormState) => void;
}) {
  const [showTerms, setShowTerms] = useState(false);
  return (
    <div className="space-y-4">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.privacyAgreed}
          onChange={(e) => onChange({ ...form, privacyAgreed: e.target.checked })}
        />
        <span>개인정보 수집·이용에 동의합니다. (필수)</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.termsAgreed}
          onChange={(e) => onChange({ ...form, termsAgreed: e.target.checked })}
        />
        <span>체육관 이용 안내에 동의합니다. (필수)</span>
      </label>
      <button
        type="button"
        className="text-xs text-matchon-primary underline"
        onClick={() => setShowTerms((v) => !v)}
      >
        {showTerms ? "전문 닫기" : "이용 안내 전문 보기"}
      </button>
      {showTerms ? (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-matchon-border bg-white p-3 text-xs text-matchon-text-secondary">
          {terms.title} (v{terms.version}){"\n\n"}
          {terms.content}
        </pre>
      ) : null}
      <div>
        <p className="mb-1 text-sm font-medium">회원 서명 *</p>
        <SignaturePad
          ref={memberPadRef}
          ariaLabel="회원 서명 패드"
          hint="아래 공간에 직접 서명해주세요."
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => memberPadRef.current?.clear()}
        >
          다시 쓰기
        </Button>
      </div>
      {minor ? (
        <div className="space-y-3 border-t border-matchon-border pt-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.guardianConsentAgreed}
              onChange={(e) =>
                onChange({ ...form, guardianConsentAgreed: e.target.checked })
              }
            />
            <span>보호자로서 미성년자 이용에 동의합니다. (필수)</span>
          </label>
          <p className="text-sm font-medium">보호자 서명 *</p>
          <SignaturePad
            ref={guardianPadRef}
            ariaLabel="보호자 서명 패드"
            hint="보호자가 아래 공간에 서명해주세요."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => guardianPadRef.current?.clear()}
          >
            다시 쓰기
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ConfirmStep({
  form,
  minor,
  ageLabel,
}: {
  form: FormState;
  minor: boolean;
  ageLabel: string | null;
}) {
  const healthYes = useMemo(
    () =>
      Object.values(form.health).some((row) => row.answer === true),
    [form.health],
  );
  return (
    <div className="space-y-2 rounded-xl border border-matchon-border bg-white p-4 text-sm">
      <Row label="이름" value={form.name} />
      <Row
        label="성별"
        value={form.gender ? GYM_MEMBER_SELF_REG_GENDER_LABELS[form.gender] : "-"}
      />
      <Row
        label="생년월일"
        value={`${form.birthDate}${ageLabel ? ` (${ageLabel})` : ""}`}
      />
      <Row label="연락처" value={form.phone} />
      {minor ? <Row label="보호자" value={form.guardianName} /> : null}
      <Row label="건강정보" value={healthYes ? "확인 필요" : "이상 없음"} />
      <Row label="동의" value="개인정보·이용안내 완료" />
      <Row label="서명" value={minor ? "회원·보호자 완료" : "회원 완료"} />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-matchon-text-primary">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-matchon-border py-1.5 last:border-0">
      <span className="text-matchon-text-secondary">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function HealthQuestion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: HealthAnswer;
  onChange: (next: HealthAnswer) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-matchon-border p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`min-h-10 rounded-lg border text-sm ${
            value.answer === false
              ? "border-matchon-primary bg-matchon-primary/5 font-semibold"
              : "border-matchon-border"
          }`}
          onClick={() => onChange({ answer: false, detail: "" })}
        >
          아니오
        </button>
        <button
          type="button"
          className={`min-h-10 rounded-lg border text-sm ${
            value.answer === true
              ? "border-matchon-primary bg-matchon-primary/5 font-semibold"
              : "border-matchon-border"
          }`}
          onClick={() => onChange({ ...value, answer: true })}
        >
          예
        </button>
      </div>
      {value.answer === true ? (
        <textarea
          className={`${matchonFieldInputClass} h-20 py-2`}
          value={value.detail}
          onChange={(e) => onChange({ answer: true, detail: e.target.value })}
          placeholder="상세 내용"
        />
      ) : null}
    </div>
  );
}
