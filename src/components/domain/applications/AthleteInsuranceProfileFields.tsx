"use client";

import {
  INSURANCE_PII_CONSENT_TEXT,
} from "@/lib/athlete-application/insurance-consent";

const labelClass = "text-muted-foreground mb-1 block text-xs font-medium";
const fieldClass =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm";

export function AthleteInsuranceProfileFields({
  idPrefix,
  recordName = "recordText",
  careerName = "careerText",
  rrnName = "residentRegistrationNumber",
  recordValue,
  careerValue,
  rrnValue,
  onRecordChange,
  onCareerChange,
  onRrnChange,
  required = true,
}: {
  idPrefix: string;
  recordName?: string;
  careerName?: string;
  rrnName?: string;
  recordValue?: string;
  careerValue?: string;
  rrnValue?: string;
  onRecordChange?: (value: string) => void;
  onCareerChange?: (value: string) => void;
  onRrnChange?: (value: string) => void;
  required?: boolean;
}) {
  const controlled = onRrnChange != null;
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-recordText`}>
          전적
        </label>
        <input
          id={`${idPrefix}-recordText`}
          name={recordName}
          className={fieldClass}
          placeholder="예: 3전 2승 1패"
          maxLength={200}
          value={controlled ? recordValue : undefined}
          defaultValue={controlled ? undefined : recordValue}
          onChange={
            onRecordChange ? (e) => onRecordChange(e.target.value) : undefined
          }
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-careerText`}>
          운동경력
        </label>
        <input
          id={`${idPrefix}-careerText`}
          name={careerName}
          className={fieldClass}
          placeholder="예: 킥복싱 2년"
          maxLength={200}
          value={controlled ? careerValue : undefined}
          defaultValue={controlled ? undefined : careerValue}
          onChange={
            onCareerChange ? (e) => onCareerChange(e.target.value) : undefined
          }
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-rrn`}>
          주민등록번호 {required ? "*" : ""}
        </label>
        <input
          id={`${idPrefix}-rrn`}
          name={rrnName}
          className={fieldClass}
          inputMode="numeric"
          autoComplete="off"
          placeholder="000000-0000000"
          maxLength={14}
          required={required}
          value={controlled ? rrnValue : undefined}
          defaultValue={controlled ? undefined : rrnValue}
          onChange={onRrnChange ? (e) => onRrnChange(e.target.value) : undefined}
        />
        <p className="text-muted-foreground mt-1 text-[11px]">
          대회 참가자 보험 가입을 위해 수집합니다.
        </p>
        <p className="text-muted-foreground text-[11px] whitespace-pre-wrap">
          {INSURANCE_PII_CONSENT_TEXT}
        </p>
      </div>
    </div>
  );
}
