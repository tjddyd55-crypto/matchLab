"use client";

import { PhoneInput } from "@/components/shared/PhoneInput";
import { GYM_STAFF_ROLE_OPTIONS } from "@/lib/gym-staff/labels";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import type { GymStaffRole } from "@/lib/enums";

export type GymStaffFormInitial = {
  name: string;
  phone: string;
  email: string | null;
  staffRole: GymStaffRole;
  title: string | null;
  colorKey: string | null;
};

/** 등록·수정 폼 공용 입력 필드 (제출 처리는 각 폼이 담당) */
export function GymStaffFormFields({
  initial,
}: {
  initial?: GymStaffFormInitial;
}) {
  return (
    <>
      <label className="block space-y-1 text-sm">
        <span>이름 *</span>
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={initial?.name ?? ""}
          className={matchonFieldInputClass}
        />
      </label>

      <PhoneInput
        name="phone"
        label="휴대전화번호"
        required
        defaultValue={initial?.phone ?? ""}
      />

      <label className="block space-y-1 text-sm">
        <span>이메일</span>
        <input
          name="email"
          type="email"
          maxLength={120}
          defaultValue={initial?.email ?? ""}
          className={matchonFieldInputClass}
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>직무 *</span>
        <select
          name="staffRole"
          defaultValue={initial?.staffRole ?? "instructor"}
          className={matchonFieldInputClass}
        >
          {GYM_STAFF_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span>직함 (예: 수석 코치)</span>
        <input
          name="title"
          maxLength={80}
          defaultValue={initial?.title ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
    </>
  );
}
