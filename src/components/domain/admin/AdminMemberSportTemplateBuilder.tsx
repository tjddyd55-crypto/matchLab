"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  normalizeGymMemberDynamicFields,
  suggestGymMemberCustomFieldKey,
  validateGymMemberDynamicFieldDefinitions,
  type GymMemberDynamicFieldDefinition,
} from "@/lib/gym-member-profile/fields";
import {
  getSportFieldGridSpan,
} from "@/lib/gym-member-profile/grid";
import { GymMemberDynamicFieldInput } from "@/components/domain/gym-members/GymMemberDynamicFieldInput";
import { DynamicFieldEditorCard } from "@/components/domain/gym-members/DynamicFieldEditorCard";
import {
  GymMemberFieldCell,
  GymMemberFieldGrid,
} from "@/components/domain/gym-members/GymMemberFormLayout";
import {
  deleteMemberSportTemplateFieldAction,
  saveMemberSportTemplateFieldsAction,
  updateMemberSportTemplateMetaAction,
} from "@/features/admin/member-sport-template-actions";
import { Button } from "@/components/ui/button";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export function AdminMemberSportTemplateBuilder({
  templateId,
  code,
  initialName,
  initialDisplayName,
  initialSportType,
  initialActive,
  initialFields,
  gymCount,
  valueUsage = {},
}: {
  templateId: string;
  code: string;
  initialName: string;
  initialDisplayName: string;
  initialSportType: string;
  initialActive: boolean;
  initialFields: GymMemberDynamicFieldDefinition[];
  gymCount: number;
  valueUsage?: Record<string, number>;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [sportType, setSportType] = useState(initialSportType);
  const [active, setActive] = useState(initialActive);
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
        active: true,
      });
      return next;
    });
  };

  function saveAll() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const meta = await updateMemberSportTemplateMetaAction(templateId, {
        name,
        displayName,
        sportType,
        active,
      });
      if (!meta.ok) {
        setError(meta.error.message);
        return;
      }
      const fieldsResult = await saveMemberSportTemplateFieldsAction(
        templateId,
        normalized,
      );
      if (!fieldsResult.ok) {
        setError(fieldsResult.error.message);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function removeField(index: number) {
    const field = fields[index];
    if (!field) return;
    setSaved(false);
    if (!field.id) {
      setFields((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    startTransition(async () => {
      const result = await deleteMemberSportTemplateFieldAction(
        field.id!,
        templateId,
      );
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

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border border-matchon-border p-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-xs text-matchon-text-secondary">종목 코드</span>
          <input
            value={code}
            readOnly
            className={matchonFieldInputClass}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-matchon-text-secondary">템플릿명</span>
          <input
            value={name}
            onChange={(e) => {
              setSaved(false);
              setName(e.target.value);
            }}
            className={matchonFieldInputClass}
          />
          <p className="text-xs text-matchon-text-secondary">
            관리자가 템플릿을 구분하기 위한 내부 이름입니다.
          </p>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-matchon-text-secondary">표시명</span>
          <input
            value={displayName}
            onChange={(e) => {
              setSaved(false);
              setDisplayName(e.target.value);
            }}
            className={matchonFieldInputClass}
          />
          <p className="text-xs text-matchon-text-secondary">
            체육관 가입·회원관리 화면에 표시되는 종목명입니다.
          </p>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-matchon-text-secondary">종목 분류</span>
          <input
            value={sportType}
            onChange={(e) => {
              setSaved(false);
              setSportType(e.target.value);
            }}
            className={matchonFieldInputClass}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={active}
            disabled={active && gymCount > 0}
            onChange={(e) => {
              setSaved(false);
              setActive(e.target.checked);
            }}
          />
          활성 {gymCount > 0 ? `(사용 체육관 ${gymCount})` : null}
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">템플릿 필드</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addField}
            >
              필드 추가
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
              필드가 없습니다. 종목별 회원 정보를 추가해 주세요.
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
                  onDelete={() => removeField(index)}
                  onDeactivateInstead={() =>
                    updateField(index, { active: false })
                  }
                />
              ))}
            </ul>
          )}

          <div className="flex justify-end pt-1">
            <Button type="button" disabled={pending} onClick={saveAll}>
              {pending ? "저장 중…" : "템플릿 저장"}
            </Button>
          </div>
        </div>

        <aside className="sticky top-4 space-y-3 rounded-lg border border-matchon-border p-3">
          <h3 className="text-sm font-semibold">회원 폼 미리보기</h3>
          {normalized.filter((f) => f.active !== false).length === 0 ? (
            <p className="text-sm text-matchon-text-secondary">
              활성 필드가 없습니다.
            </p>
          ) : (
            <GymMemberFieldGrid>
              {normalized
                .filter((f) => f.active !== false)
                .map((field) => (
                  <GymMemberFieldCell
                    key={field.stableKey}
                    span={getSportFieldGridSpan(field.stableKey, field.type)}
                  >
                    <GymMemberDynamicFieldInput
                      field={field}
                      namePrefix="sport"
                    />
                  </GymMemberFieldCell>
                ))}
            </GymMemberFieldGrid>
          )}
        </aside>
      </div>
    </div>
  );
}
