"use client";

import { useId, useState } from "react";
import {
  isCompleteDateOnlyString,
  isValidDateOnlyString,
  normalizeDateOnlyInput,
  todayUtcDateOnlyString,
} from "@/lib/date-only";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

type AppDateInputProps = {
  name: string;
  id?: string;
  label?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onValueChange?: (next: string) => void;
  className?: string;
  inputClassName?: string;
  disallowFuture?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
};

/**
 * date-only SSOT 입력.
 * native type=date 연도 5자리 이슈를 피해 text + numeric + 선택형 calendar.
 */
export function AppDateInput({
  name,
  id: idProp,
  label,
  required,
  defaultValue = "",
  value: valueProp,
  onValueChange,
  className,
  inputClassName,
  disallowFuture,
  disabled,
  "aria-label": ariaLabel,
}: AppDateInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const pickerId = `${id}-picker`;
  const controlled = valueProp !== undefined;
  const [inner, setInner] = useState(() =>
    normalizeDateOnlyInput(defaultValue),
  );
  const value = controlled ? normalizeDateOnlyInput(valueProp) : inner;
  const [error, setError] = useState<string | null>(null);

  function commit(next: string) {
    if (!controlled) setInner(next);
    onValueChange?.(next);
  }

  function applyRaw(raw: string) {
    const next = normalizeDateOnlyInput(raw);
    commit(next);
    if (!next) {
      setError(null);
      return;
    }
    if (!isCompleteDateOnlyString(next)) {
      setError(null);
      return;
    }
    if (!isValidDateOnlyString(next)) {
      setError("올바른 날짜(YYYY-MM-DD)를 입력해 주세요.");
      return;
    }
    if (disallowFuture && next > todayUtcDateOnlyString()) {
      setError("미래 날짜는 입력할 수 없습니다.");
      return;
    }
    setError(null);
  }

  const field = (
    <div className={cn("flex gap-2", className)}>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="YYYY-MM-DD"
        required={required}
        disabled={disabled}
        value={value}
        aria-label={ariaLabel ?? label}
        aria-invalid={error ? true : undefined}
        maxLength={10}
        className={cn(matchonFieldInputClass, "min-w-0 flex-1", inputClassName)}
        onChange={(e) => applyRaw(e.target.value)}
        onBlur={() => {
          if (!value) {
            setError(null);
            return;
          }
          if (!isValidDateOnlyString(value)) {
            setError("올바른 날짜(YYYY-MM-DD)를 입력해 주세요.");
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text) {
            e.preventDefault();
            applyRaw(text);
          }
        }}
      />
      <input
        id={pickerId}
        type="date"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        value={isValidDateOnlyString(value) ? value : ""}
        max={disallowFuture ? todayUtcDateOnlyString() : undefined}
        className="sr-only"
        onChange={(e) => {
          const v = e.target.value;
          if (v) applyRaw(v);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        className="shrink-0 rounded-lg border border-matchon-border bg-white px-3 text-sm font-medium text-matchon-text-secondary hover:bg-matchon-surface disabled:opacity-60"
        onClick={() => {
          const el = document.getElementById(
            pickerId,
          ) as HTMLInputElement | null;
          el?.showPicker?.();
          el?.click();
        }}
      >
        선택
      </button>
    </div>
  );

  if (!label) {
    return (
      <div className="space-y-1">
        {field}
        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <label className="block space-y-1.5 text-sm" htmlFor={id}>
      <span className="font-semibold text-matchon-text-primary">{label}</span>
      {field}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}
