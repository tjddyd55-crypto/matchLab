"use client";

import { SCHOOL_GRADE_SELECT_OPTIONS } from "@/lib/fighter/school-grade-input";
import { cn } from "@/lib/utils";

type SchoolGradeSelectFieldProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  labelClassName?: string;
  label?: string;
  disabled?: boolean;
};

/**
 * 학년 dropdown — 선택 안 함 + 초1~고3 + 대학생 + 성인.
 * 저장 정규화는 parseSchoolGradeSelectValue SSOT.
 */
export function SchoolGradeSelectField({
  id = "schoolGradeSelect",
  name = "schoolGradeSelect",
  value,
  defaultValue,
  onChange,
  className,
  labelClassName,
  label = "학년",
  disabled,
}: SchoolGradeSelectFieldProps) {
  const controlled = value !== undefined;

  return (
    <div>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        className={cn(className)}
        disabled={disabled}
        {...(controlled
          ? {
              value,
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                onChange?.(e.target.value),
            }
          : { defaultValue: defaultValue ?? "" })}
      >
        <option value="">선택 안 함</option>
        {SCHOOL_GRADE_SELECT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
