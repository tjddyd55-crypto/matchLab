"use client";

import { useMemo, useState, useTransition } from "react";
import {
  normalizeGymMemberDynamicFields,
  suggestGymMemberCustomFieldKey,
  validateGymMemberDynamicFieldDefinitions,
  type GymMemberDynamicFieldDefinition,
} from "@/lib/gym-member-profile/fields";
import {
  getMemberFieldGridSpan,
} from "@/lib/gym-member-profile/grid";
import { GymMemberDynamicFieldInput } from "@/components/domain/gym-members/GymMemberDynamicFieldInput";
import { DynamicFieldEditorCard } from "@/components/domain/gym-members/DynamicFieldEditorCard";
import {
  GymMemberFieldCell,
  GymMemberFieldGrid,
} from "@/components/domain/gym-members/GymMemberFormLayout";
import {
  deleteGymMemberCustomFieldAction,
  saveGymMemberCustomFieldsAction,
} from "@/features/gym-members/profile-actions";
import { Button } from "@/components/ui/button";

export function GymMemberCustomFieldBuilder({
  initialFields,
  valueUsage = {},
}: {
  initialFields: GymMemberDynamicFieldDefinition[];
  valueUsage?: Record<string, number>;
}) {
  const [fields, setFields] = useState(initialFields);
  const [usage, setUsage] = useState(valueUsage);
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

  const duplicateField = (index: number) => {
    setSaved(false);
    const source = fields[index];
    if (!source) return;
    const keys = new Set(fields.map((f) => f.stableKey));
    const stableKey = suggestGymMemberCustomFieldKey(
      `${source.label} copy`,
      keys,
    );
    setFields((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, {
        ...source,
        id: undefined,
        stableKey,
        label: `${source.label} (복제)`,
        displayOrder: index + 2,
        active: true,
      });
      return next;
    });
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

  function removeLocalOrServer(index: number) {
    const field = fields[index];
    if (!field) return;
    setSaved(false);

    if (!field.id) {
      setFields((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    startTransition(async () => {
      const result = await deleteGymMemberCustomFieldAction(field.id!);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setFields((prev) => prev.filter((_, i) => i !== index));
      setUsage((prev) => {
        const next = { ...prev };
        delete next[field.stableKey];
        return next;
      });
    });
  }

  function deactivateField(index: number) {
    updateField(index, { active: false });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start">
      <div className="space-y-3">
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
          <ul className="space-y-2">
            {fields.map((field, index) => (
              <DynamicFieldEditorCard
                key={`${field.stableKey}-${index}`}
                index={index}
                field={field}
                total={fields.length}
                valueCount={usage[field.stableKey] ?? 0}
                onChange={(patch) => updateField(index, patch)}
                onMove={(dir) => moveField(index, dir)}
                onToggleActive={() =>
                  updateField(index, { active: field.active === false })
                }
                onDuplicate={() => duplicateField(index)}
                onDelete={() => removeLocalOrServer(index)}
                onDeactivateInstead={() => deactivateField(index)}
              />
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-1">
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "저장 중…" : "설정 저장"}
          </Button>
        </div>
      </div>

      <aside className="sticky top-4 space-y-3 rounded-lg border border-matchon-border p-3">
        <h3 className="text-sm font-semibold">미리보기</h3>
        {normalized.filter((f) => f.active !== false).length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">
            활성 항목이 없습니다.
          </p>
        ) : (
          <GymMemberFieldGrid>
            {normalized
              .filter((f) => f.active !== false)
              .map((field) => (
                <GymMemberFieldCell
                  key={field.stableKey}
                  span={getMemberFieldGridSpan(field.type)}
                >
                  <GymMemberDynamicFieldInput
                    field={field}
                    namePrefix="gym"
                  />
                </GymMemberFieldCell>
              ))}
          </GymMemberFieldGrid>
        )}
      </aside>
    </div>
  );
}
