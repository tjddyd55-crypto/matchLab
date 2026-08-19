"use client";

import { useState, useId } from "react";
import {
  INSURANCE_PII_CONSENT_TEXT,
} from "@/lib/athlete-application/insurance-consent";
import {
  buildRecordText,
  validateRecord,
} from "@/lib/fighter/record";

const labelClass = "text-muted-foreground mb-1 block text-xs font-medium";
const fieldClass =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm";

// ────────────────────────────────────────────────────
// 구조화 전적 입력 컴포넌트
// ────────────────────────────────────────────────────

export type StructuredRecordValue = {
  totalBouts: number;
  wins: number;
  draws: number;
  losses: number;
};

function parseNonNegInt(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * 총전/승/무/패 4개 숫자 입력 + 실시간 미리보기.
 * 외부 state가 있으면 controlled, 없으면 uncontrolled (hidden inputs 사용).
 */
export function StructuredRecordFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value?: StructuredRecordValue;
  onChange?: (v: StructuredRecordValue) => void;
}) {
  const uid = useId();
  const prefix = idPrefix || uid;

  const isControlled = value !== undefined;

  const [local, setLocal] = useState<StructuredRecordValue>({
    totalBouts: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  });

  const current = isControlled ? value : local;

  function update(patch: Partial<StructuredRecordValue>) {
    const next = { ...current, ...patch };
    if (!isControlled) setLocal(next);
    onChange?.(next);
  }

  const isZero =
    current.totalBouts === 0 &&
    current.wins === 0 &&
    current.draws === 0 &&
    current.losses === 0;

  const validation = validateRecord(current);
  const preview = validation.ok
    ? buildRecordText(current)
    : null;

  function handleNoRecord() {
    update({ totalBouts: 0, wins: 0, draws: 0, losses: 0 });
  }

  const numFieldClass =
    "border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm text-center w-full";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={labelClass} style={{ marginBottom: 0 }}>
          전적
        </span>
        <button
          type="button"
          onClick={handleNoRecord}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            isZero
              ? "border-primary text-primary bg-primary/10"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          무전
        </button>
      </div>

      {/* 4개 숫자 입력 — 2×2 grid (모바일 390 대응) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            { key: "totalBouts", label: "총전" },
            { key: "wins", label: "승" },
            { key: "draws", label: "무" },
            { key: "losses", label: "패" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key}>
            <label
              className="text-muted-foreground mb-1 block text-xs font-medium text-center"
              htmlFor={`${prefix}-${key}`}
            >
              {label}
            </label>
            <input
              id={`${prefix}-${key}`}
              name={key}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className={numFieldClass}
              value={isControlled ? current[key] : undefined}
              defaultValue={isControlled ? undefined : current[key]}
              onChange={(e) =>
                update({ [key]: parseNonNegInt(e.target.value) })
              }
            />
          </div>
        ))}
      </div>

      {/* 실시간 미리보기 */}
      <div className="flex items-center gap-2 min-h-[20px]">
        {preview != null ? (
          <span className="text-xs text-muted-foreground">
            전적:{" "}
            <span className="font-medium text-foreground">{preview}</span>
          </span>
        ) : null}
        {!validation.ok ? (
          <span className="text-xs text-destructive" role="alert">
            {validation.error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

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
