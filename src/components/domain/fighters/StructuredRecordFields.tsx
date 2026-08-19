"use client";

/**
 * 총전/승/무/패 4개 숫자 입력 + 실시간 미리보기.
 * AthleteInsuranceProfileFields, GymFighterForm, FighterRegistrationForm 공통 사용.
 */

import { useState, useId } from "react";
import { buildRecordText, validateRecord } from "@/lib/fighter/record";

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

const EMPTY_RECORD: StructuredRecordValue = {
  totalBouts: 0,
  wins: 0,
  draws: 0,
  losses: 0,
};

/**
 * controlled 모드: value + onChange 모두 제공
 * uncontrolled 모드: 둘 다 생략 (FormData hidden input 사용)
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

  const [local, setLocal] = useState<StructuredRecordValue>(EMPTY_RECORD);

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
  const preview = validation.ok ? buildRecordText(current) : null;

  const numFieldClass =
    "border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm text-center w-full";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground mb-1 block text-xs font-medium" style={{ marginBottom: 0 }}>
          전적
        </span>
        <button
          type="button"
          onClick={() => update(EMPTY_RECORD)}
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
              onChange={(e) => update({ [key]: parseNonNegInt(e.target.value) })}
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
