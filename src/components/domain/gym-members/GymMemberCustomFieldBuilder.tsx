"use client";

import { useMemo, useState, useTransition } from "react";
import type { GymMemberDynamicFieldType } from "@/generated/prisma";
import {
  normalizeGymMemberDynamicFields,
  suggestGymMemberCustomFieldKey,
  validateGymMemberDynamicFieldDefinitions,
  type GymMemberDynamicFieldDefinition,
} from "@/lib/gym-member-profile/fields";
import { GYM_MEMBER_DYNAMIC_FIELD_TYPES } from "@/lib/gym-member-profile/field-types";
import { GYM_MEMBER_DYNAMIC_FIELD_TYPE_LABEL } from "@/lib/gym-member-profile/ui-labels";
import { GymMemberDynamicFieldInput } from "@/components/domain/gym-members/GymMemberDynamicFieldInput";
import { saveGymMemberCustomFieldsAction } from "@/features/gym-members/profile-actions";
import { Button } from "@/components/ui/button";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

const fieldClass = matchonFieldInputClass;

export function GymMemberCustomFieldBuilder({
  initialFields,
}: {
  initialFields: GymMemberDynamicFieldDefinition[];
}) {
  const [fields, setFields] = useState(initialFields);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const normalized = useMemo(
    () => normalizeGymMemberDynamicFields(fields),
    [fields],
  );
  const localValidation = useMemo(
    () =>
      fields.length > 0
        ? validateGymMemberDynamicFieldDefinitions(normalized)
        : null,
    [fields.length, normalized],
  );

  const updateField = (
    index: number,
    patch: Partial<GymMemberDynamicFieldDefinition>,
  ) => {
    setSaved(false);
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  };

  const addField = () => {
    setSaved(false);
    const keys = new Set(fields.map((f) => f.stableKey));
    const label = `항목 ${fields.length + 1}`;
    const stableKey = suggestGymMemberCustomFieldKey(label, keys);
    setFields((prev) => [
      ...prev,
      {
        stableKey,
        label,
        type: "text",
        required: false,
        displayOrder: prev.length + 1,
        active: true,
      },
    ]);
  };

  const moveField = (index: number, dir: -1 | 1) => {
    setSaved(false);
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const toggleActive = (index: number) => {
    setSaved(false);
    updateField(index, { active: fields[index]?.active === false });
  };

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveGymMemberCustomFieldsAction(normalized);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-start">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">추가 입력 항목</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addField}>
            항목 추가
          </Button>
        </div>

        {error || localValidation ? (
          <p className="text-destructive text-sm" role="alert">
            {error ?? localValidation}
          </p>
        ) : saved ? (
          <p className="text-sm text-emerald-700">저장되었습니다.</p>
        ) : null}

        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-matchon-border px-3 py-4 text-sm text-matchon-text-secondary">
            아직 추가 항목이 없습니다. 회원 등록·수정 화면에 표시할 항목을
            추가해 주세요.
          </p>
        ) : (
          <ul className="space-y-3">
            {fields.map((field, index) => (
              <li
                key={`${field.stableKey}-${index}`}
                className={cn(
                  "space-y-3 rounded-lg border border-matchon-border p-3",
                  field.active === false && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-matchon-text-secondary">
                    #{index + 1} · {field.stableKey}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => moveField(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === fields.length - 1}
                      onClick={() => moveField(index, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(index)}
                    >
                      {field.active === false ? "활성화" : "비활성"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm sm:col-span-2">
                    <span>라벨 *</span>
                    <input
                      className={fieldClass}
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>입력 유형</span>
                    <select
                      className={fieldClass}
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, {
                          type: e.target.value as GymMemberDynamicFieldType,
                        })
                      }
                    >
                      {GYM_MEMBER_DYNAMIC_FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {GYM_MEMBER_DYNAMIC_FIELD_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required === true}
                      onChange={(e) =>
                        updateField(index, { required: e.target.checked })
                      }
                    />
                    필수 입력
                  </label>
                  <label className="block space-y-1 text-sm sm:col-span-2">
                    <span>placeholder</span>
                    <input
                      className={fieldClass}
                      value={field.placeholder ?? ""}
                      onChange={(e) =>
                        updateField(index, { placeholder: e.target.value })
                      }
                    />
                  </label>
                  <label className="block space-y-1 text-sm sm:col-span-2">
                    <span>도움말</span>
                    <input
                      className={fieldClass}
                      value={field.helpText ?? ""}
                      onChange={(e) =>
                        updateField(index, { helpText: e.target.value })
                      }
                    />
                  </label>
                  {(field.type === "select" ||
                    field.type === "radio" ||
                    field.type === "checkbox") && (
                    <label className="block space-y-1 text-sm sm:col-span-2">
                      <span>선택지 (줄바꿈으로 구분)</span>
                      <textarea
                        className={cn(fieldClass, "min-h-[5rem] py-2")}
                        value={(field.options ?? []).join("\n")}
                        onChange={(e) =>
                          updateField(index, {
                            options: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "저장 중…" : "설정 저장"}
          </Button>
        </div>
      </div>

      <aside className="space-y-3 rounded-lg border border-matchon-border p-3">
        <h3 className="text-sm font-semibold">미리보기</h3>
        {normalized.filter((f) => f.active !== false).length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">
            활성 항목이 없습니다.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {normalized
              .filter((f) => f.active !== false)
              .map((field) => (
                <GymMemberDynamicFieldInput
                  key={field.stableKey}
                  field={field}
                  namePrefix="gym"
                />
              ))}
          </div>
        )}
      </aside>
    </div>
  );
}
