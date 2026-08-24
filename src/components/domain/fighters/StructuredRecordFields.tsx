"use client";

/**
 * 총전/승/무/패 입력 + 실시간 미리보기.
 * 승·무·패 빈값 = 모름(null). 숫자 0과 구분.
 */

import { useState, useId } from "react";
import { buildRecordText, validateRecord } from "@/lib/fighter/record";

export type StructuredRecordValue = {
  totalBouts: number;
  wins: number | null;
  draws: number | null;
  losses: number | null;
};

function parseOptionalNonNegInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseTotalBouts(raw: string): number {
  const t = raw.trim();
  if (t === "") return 0;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

const EMPTY_RECORD: StructuredRecordValue = {
  totalBouts: 0,
  wins: null,
  draws: null,
  losses: null,
};

/**
 * controlled 모드: value + onChange 모두 제공
 * uncontrolled 모드: 둘 다 생략 (FormData hidden input 사용)
 */
export function StructuredRecordFields({
  idPrefix,
  value,
  defaultValue,
  onChange,
}: {
  idPrefix: string;
  value?: StructuredRecordValue;
  /** uncontrolled 초기값 (신청 snapshot preload 등) */
  defaultValue?: StructuredRecordValue;
  onChange?: (v: StructuredRecordValue) => void;
}) {
  const uid = useId();
  const prefix = idPrefix || uid;

  const isControlled = value !== undefined;

  const [local, setLocal] = useState<StructuredRecordValue>(
    defaultValue ?? EMPTY_RECORD,
  );

  const current = isControlled ? value : local;

  function update(patch: Partial<StructuredRecordValue>) {
    const next = { ...current, ...patch };
    if (!isControlled) setLocal(next);
    onChange?.(next);
  }

  const isZeroRecord = current.totalBouts === 0;

  const validation = validateRecord(current);
  const preview = validation.ok ? buildRecordText(current) : null;

  const numFieldClass =
    "border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm text-center w-full";

  const detailFields = [
    { key: "wins" as const, label: "승" },
    { key: "draws" as const, label: "무" },
    { key: "losses" as const, label: "패" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          className="text-muted-foreground mb-1 block text-xs font-medium"
          style={{ marginBottom: 0 }}
        >
          전적
        </span>
        <button
          type="button"
          onClick={() => update(EMPTY_RECORD)}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            isZeroRecord
              ? "border-primary text-primary bg-primary/10"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          무전
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label
            className="text-muted-foreground mb-1 block text-xs font-medium text-center"
            htmlFor={`${prefix}-totalBouts`}
          >
            총전
          </label>
          <input
            id={`${prefix}-totalBouts`}
            name="totalBouts"
            type="text"
            inputMode="numeric"
            className={numFieldClass}
            value={isControlled ? String(current.totalBouts) : undefined}
            defaultValue={
              isControlled ? undefined : String(current.totalBouts)
            }
            onChange={(e) =>
              update({ totalBouts: parseTotalBouts(e.target.value) })
            }
            aria-label="총전적"
          />
        </div>
        {detailFields.map(({ key, label }) => {
          const v = current[key];
          return (
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
                type="text"
                inputMode="numeric"
                className={numFieldClass}
                placeholder="모름"
                value={
                  isControlled ? (v == null ? "" : String(v)) : undefined
                }
                defaultValue={
                  isControlled ? undefined : v == null ? "" : String(v)
                }
                onChange={(e) =>
                  update({ [key]: parseOptionalNonNegInt(e.target.value) })
                }
                aria-label={`${label} (비우면 모름)`}
              />
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground text-[11px] leading-snug">
        승·무·패를 모르면 총전적만 입력할 수 있습니다. 빈 칸은 모름입니다.
      </p>

      <div className="flex min-h-[20px] items-center gap-2">
        {preview != null ? (
          <span className="text-muted-foreground text-xs">
            전적:{" "}
            <span className="text-foreground font-medium">{preview}</span>
          </span>
        ) : null}
        {!validation.ok ? (
          <span className="text-destructive text-xs" role="alert">
            {validation.error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
