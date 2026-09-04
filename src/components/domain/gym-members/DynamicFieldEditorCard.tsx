"use client";

import type { GymMemberDynamicFieldType } from "@/generated/prisma";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import { GYM_MEMBER_DYNAMIC_FIELD_TYPES } from "@/lib/gym-member-profile/field-types";
import { GYM_MEMBER_DYNAMIC_FIELD_TYPE_LABEL } from "@/lib/gym-member-profile/ui-labels";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { matchonFieldInputClass, matchonFieldTextareaClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

const fieldClass = cn(matchonFieldInputClass, "min-h-9 text-sm");

export function DynamicFieldEditorCard({
  index,
  field,
  total,
  valueCount = 0,
  onChange,
  onMove,
  onToggleActive,
  onDuplicate,
  onDelete,
  onDeactivateInstead,
}: {
  index: number;
  field: GymMemberDynamicFieldDefinition;
  total: number;
  valueCount?: number;
  onChange: (patch: Partial<GymMemberDynamicFieldDefinition>) => void;
  onMove: (dir: -1 | 1) => void;
  onToggleActive: () => void;
  onDuplicate?: () => void;
  onDelete: () => void;
  onDeactivateInstead?: () => void;
}) {
  const { confirm } = useAppConfirmDialog();
  const inactive = field.active === false;
  const hasValues = valueCount > 0;

  async function handleDeleteClick() {
    if (hasValues) {
      const ok = await confirm({
        title: "항목 비활성화",
        description:
          "이 항목에는 저장된 회원 정보가 있어 바로 삭제할 수 없습니다.\n비활성화하면 기존 정보는 보존되고 신규 입력 화면에서는 숨겨집니다.\n\n비활성화하시겠습니까?",
        variant: "danger",
      });
      if (ok) onDeactivateInstead?.() ?? onToggleActive();
      return;
    }
    const ok = await confirm({
      title: "항목 삭제",
      description: "이 항목을 삭제하시겠습니까?",
      variant: "danger",
    });
    if (ok) onDelete();
  }

  return (
    <li
      className={cn(
        "space-y-2 rounded-lg border border-matchon-border p-2.5",
        inactive && "opacity-70",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-matchon-text-secondary">
          <span className="font-medium">
            #{index + 1} · {field.stableKey}
          </span>
          {inactive ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              비활성
            </span>
          ) : null}
          {hasValues ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              값 {valueCount}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </Button>
          {onDuplicate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onDuplicate}
            >
              복제
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onToggleActive}
          >
            {inactive ? "다시 활성화" : "비활성"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive"
            onClick={() => void handleDeleteClick()}
          >
            삭제
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <label className="col-span-12 space-y-0.5 text-xs sm:col-span-6">
          <span className="text-matchon-text-secondary">라벨 *</span>
          <input
            className={fieldClass}
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>
        <label className="col-span-6 space-y-0.5 text-xs sm:col-span-3">
          <span className="text-matchon-text-secondary">입력 유형</span>
          <select
            className={fieldClass}
            value={field.type}
            onChange={(e) =>
              onChange({
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
        <label className="col-span-6 flex items-end gap-2 pb-1 text-xs sm:col-span-3">
          <input
            type="checkbox"
            checked={field.required === true}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          필수
        </label>
        <label className="col-span-12 space-y-0.5 text-xs sm:col-span-6">
          <span className="text-matchon-text-secondary">placeholder</span>
          <input
            className={fieldClass}
            value={field.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
          />
        </label>
        <label className="col-span-12 space-y-0.5 text-xs sm:col-span-6">
          <span className="text-matchon-text-secondary">도움말</span>
          <input
            className={fieldClass}
            value={field.helpText ?? ""}
            onChange={(e) => onChange({ helpText: e.target.value })}
          />
        </label>
        {(field.type === "select" ||
          field.type === "radio" ||
          field.type === "checkbox") && (
          <label className="col-span-12 space-y-0.5 text-xs">
            <span className="text-matchon-text-secondary">
              선택지 (줄바꿈으로 구분)
            </span>
            <textarea
              rows={4}
              className={cn(matchonFieldTextareaClass, "text-sm")}
              value={(field.options ?? []).join("\n")}
              onChange={(e) =>
                onChange({
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
  );
}
