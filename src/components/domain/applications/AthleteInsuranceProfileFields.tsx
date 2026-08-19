"use client";

import { useState } from "react";
import {
  INSURANCE_PII_CONSENT_TEXT,
} from "@/lib/athlete-application/insurance-consent";
import {
  StructuredRecordFields,
  type StructuredRecordValue,
} from "@/components/domain/fighters/StructuredRecordFields";

export { StructuredRecordFields, type StructuredRecordValue };

const labelClass = "text-muted-foreground mb-1 block text-xs font-medium";
const fieldClass =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm";

// ────────────────────────────────────────────────────
// 기존 AthleteInsuranceProfileFields (전적 구조화 통합)
// ────────────────────────────────────────────────────

export function AthleteInsuranceProfileFields({
  idPrefix,
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
  /** @deprecated 내부에서 구조화 필드로 교체됨. recordText hidden 전달용으로만 사용 */
  recordName?: string;
  careerName?: string;
  rrnName?: string;
  recordValue?: StructuredRecordValue;
  careerValue?: string;
  rrnValue?: string;
  onRecordChange?: (value: StructuredRecordValue) => void;
  onCareerChange?: (value: string) => void;
  onRrnChange?: (value: string) => void;
  required?: boolean;
}) {
  const controlled = onRrnChange != null;
  return (
    <div className="space-y-3">
      <StructuredRecordFields
        idPrefix={idPrefix}
        value={recordValue}
        onChange={onRecordChange}
      />
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
