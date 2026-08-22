"use client";

import { useCallback, useRef, useState } from "react";
import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import {
  DIVISION_TEMPLATE_GENDER_LABELS,
  DIVISION_TEMPLATE_GENDERS,
  type DivisionTemplateGender,
} from "@/lib/division-template/division-template-constants";
import {
  buildWeightClassDisplay,
  normalizeTemplateItemWeight,
} from "@/lib/division-template/division-template-row";
import { normalizeWeightLimitInput } from "@/lib/division-template/division-template-parse";
import {
  formatDivisionMainLabel,
  formatDivisionSportTitle,
} from "@/lib/event-division-fields";
import { Button } from "@/components/ui/button";
import {
  formControlFieldClass,
  formControlFieldCompactClass,
  formControlFieldStackClass,
  formControlLabelMutedClass,
} from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";

/**
 * 블럭 생성형 체급표 에디터.
 *
 * 데이터 모델은 기존과 동일한 flat `DivisionTemplateItemInput[]`을 유지한다.
 * 종목은 페이지 상단 `sportType`만 사용하고, 체급 row에는 묶음·성별·체급명·체중만 입력한다.
 */

type WeightRow = {
  id: string;
  weightClassName: string;
  weightLimitText: string;
  /** true면 체중 기준 없음 (weightLimitText 무시) */
  unlimited: boolean;
};

type GroupBlock = {
  id: string;
  ageGroup: string;
  rows: Record<DivisionTemplateGender, WeightRow[]>;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

/** SSR/CSR hydration 일치용 — 초기 derive에만 사용 */
function stableId(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((p) => String(p ?? "").trim().replace(/\s+/g, "_") || "_")
    .join("__");
}

function emptyRow(): WeightRow {
  return {
    id: newId(),
    weightClassName: "",
    weightLimitText: "",
    unlimited: false,
  };
}

function bucketGender(gender: string | null | undefined): DivisionTemplateGender {
  return gender?.trim() === "female" ? "female" : "male";
}

function emptyBlock(): GroupBlock {
  return {
    id: newId(),
    ageGroup: "",
    rows: { male: [], female: [] },
  };
}

/** 저장된 flat items를 묶음(ageGroup) 순서대로 블럭 구조로 복원한다. */
function deriveBlocks(items: DivisionTemplateItemInput[]): GroupBlock[] {
  const blocks: GroupBlock[] = [];
  const byAgeGroup = new Map<string, GroupBlock>();

  for (const item of items) {
    if (item.isActive === false) continue;
    const ageGroup = item.ageGroup?.trim() ?? "";
    let block = byAgeGroup.get(ageGroup);
    if (!block) {
      block = {
        id: stableId(["block", ageGroup || `i${blocks.length}`]),
        ageGroup,
        rows: { male: [], female: [] },
      };
      byAgeGroup.set(ageGroup, block);
      blocks.push(block);
    }

    const gender = bucketGender(item.gender);
    const normalized = normalizeTemplateItemWeight(item);
    const rowIndex = block.rows[gender].length;
    block.rows[gender].push({
      id: stableId([
        "row",
        ageGroup,
        gender,
        rowIndex,
        normalized.weightClassName,
        normalized.weightLimitText,
      ]),
      weightClassName: normalized.weightClassName?.trim() ?? "",
      weightLimitText: normalized.weightLimitText?.trim() ?? "",
      unlimited: !normalized.weightLimitText?.trim(),
    });
  }

  return blocks;
}

/** 블럭 구조를 저장용 flat items로 평탄화한다. (빈 행은 sanitize 단계에서 제거) */
function flattenBlocks(
  blocks: GroupBlock[],
  templateSportType: string,
): DivisionTemplateItemInput[] {
  const items: DivisionTemplateItemInput[] = [];
  const sportType = templateSportType.trim();

  blocks.forEach((block) => {
    DIVISION_TEMPLATE_GENDERS.forEach((gender) => {
      block.rows[gender].forEach((row, idx) => {
        const base: DivisionTemplateItemInput = {
          sportType,
          ruleType: null,
          gender,
          ageGroup: block.ageGroup.trim() || null,
          weightClassName: row.weightClassName.trim() || null,
          weightLimitText: row.unlimited
            ? null
            : row.weightLimitText.trim() || null,
          weightLimitKg: null,
          limitType: null,
          weightClass: null,
          skillLevel: null,
          displayOrder: idx,
          isActive: true,
        };
        items.push({ ...base, weightClass: buildWeightClassDisplay(base) });
      });
    });
  });
  return items;
}

function GenderColumn({
  gender,
  rows,
  onRowsChange,
}: {
  gender: DivisionTemplateGender;
  rows: WeightRow[];
  onRowsChange: (next: WeightRow[]) => void;
}) {
  const updateRow = (id: string, patch: Partial<WeightRow>) =>
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) =>
    onRowsChange(rows.filter((r) => r.id !== id));
  const addRow = () => onRowsChange([...rows, emptyRow()]);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <h4 className="text-sm font-medium">
        {DIVISION_TEMPLATE_GENDER_LABELS[gender]}
      </h4>
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="text-muted-foreground border-b">
            <th className="px-1 py-1.5 font-medium">체급명 (선택)</th>
            <th className="px-1 py-1.5 font-medium">체중 기준 (선택)</th>
            <th className="w-14 px-1 py-1.5 font-medium">제한</th>
            <th className="w-12 px-1 py-1.5 font-medium">동작</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-muted-foreground px-1 py-2">
                체급 행이 없습니다. 행을 추가한 뒤 체급명·체중을 비우면
                「부문 · 성별」만으로 경기구분이 됩니다.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-1 py-1">
                  <input
                    className={formControlFieldCompactClass}
                    value={row.weightClassName}
                    placeholder="예: 플라이급 (선택)"
                    onChange={(e) =>
                      updateRow(row.id, { weightClassName: e.target.value })
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={cn(formControlFieldCompactClass, "font-mono")}
                    value={row.unlimited ? "" : row.weightLimitText}
                    placeholder={row.unlimited ? "제한 없음" : "54"}
                    disabled={row.unlimited}
                    onChange={(e) =>
                      updateRow(row.id, {
                        weightLimitText: e.target.value,
                        unlimited: false,
                      })
                    }
                    onBlur={(e) => {
                      if (row.unlimited) return;
                      const normalized = normalizeWeightLimitInput(
                        e.target.value,
                      );
                      if (normalized !== row.weightLimitText) {
                        updateRow(row.id, { weightLimitText: normalized });
                      }
                    }}
                  />
                </td>
                <td className="px-1 py-1">
                  <label className="flex cursor-pointer items-center gap-1 text-[11px]">
                    <input
                      type="checkbox"
                      checked={row.unlimited}
                      onChange={(e) =>
                        updateRow(row.id, {
                          unlimited: e.target.checked,
                          weightLimitText: e.target.checked
                            ? ""
                            : row.weightLimitText,
                        })
                      }
                    />
                    <span className="text-muted-foreground whitespace-nowrap">
                      없음
                    </span>
                  </label>
                </td>
                <td className="px-1 py-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => removeRow(row.id)}
                  >
                    삭제
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        + 체급 행 추가
      </Button>
    </div>
  );
}

export function WeightClassRowsEditor({
  sportType,
  items,
  onChange,
}: {
  sportType: string;
  items: DivisionTemplateItemInput[];
  onChange: (next: DivisionTemplateItemInput[]) => void;
}) {
  const [blocks, setBlocks] = useState<GroupBlock[]>(() => deriveBlocks(items));
  const focusBlockId = useRef<string | null>(null);

  const commit = useCallback(
    (next: GroupBlock[]) => {
      setBlocks(next);
      onChange(flattenBlocks(next, sportType));
    },
    [onChange, sportType],
  );

  const addBlock = () => {
    const block = emptyBlock();
    focusBlockId.current = block.id;
    commit([...blocks, block]);
  };

  const removeBlock = (id: string) =>
    commit(blocks.filter((b) => b.id !== id));

  const updateBlock = (id: string, patch: Partial<GroupBlock>) =>
    commit(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const updateRows = (
    blockId: string,
    gender: DivisionTemplateGender,
    next: WeightRow[],
  ) =>
    commit(
      blocks.map((b) =>
        b.id === blockId
          ? { ...b, rows: { ...b.rows, [gender]: next } }
          : b,
      ),
    );

  const nameInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node && node.dataset.blockId === focusBlockId.current) {
      node.focus();
      focusBlockId.current = null;
    }
  }, []);

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center">
          <p className="text-muted-foreground text-sm">
            아직 묶음이 없습니다. 묶음을 생성해 체급을 입력하세요.
          </p>
        </div>
      ) : (
        blocks.map((block) => (
          <section
            key={block.id}
            className="space-y-3 rounded-xl border p-4"
          >
            <div className="flex items-end gap-2">
              <label className={cn(formControlFieldStackClass, "flex-1")}>
                <span className={formControlLabelMutedClass}>묶음 이름</span>
                <input
                  ref={nameInputRef}
                  data-block-id={block.id}
                  className={formControlFieldClass}
                  value={block.ageGroup}
                  placeholder="초등부"
                  onChange={(e) =>
                    updateBlock(block.id, { ageGroup: e.target.value })
                  }
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeBlock(block.id)}
              >
                블럭 삭제
              </Button>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {DIVISION_TEMPLATE_GENDERS.map((gender) => (
                <GenderColumn
                  key={gender}
                  gender={gender}
                  rows={block.rows[gender]}
                  onRowsChange={(next) => updateRows(block.id, gender, next)}
                />
              ))}
            </div>
          </section>
        ))
      )}
      <Button type="button" variant="secondary" onClick={addBlock}>
        + 묶음 생성
      </Button>
    </div>
  );
}

/** 저장 전 미리보기 — 묶음(ageGroup) 순서대로 SSOT compact 라벨로 렌더링. */
export function DivisionTemplatePreview({
  items,
  sportType,
}: {
  items: DivisionTemplateItemInput[];
  sportType: string | null;
}) {
  const active = items.filter((i) => i.isActive !== false);
  if (active.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">미리볼 체급이 없습니다.</p>
    );
  }

  const sportTitle = formatDivisionSportTitle({ sportType });
  const ageGroups: string[] = [];
  for (const item of active) {
    const ag = item.ageGroup?.trim() ?? "";
    if (!ageGroups.includes(ag)) ageGroups.push(ag);
  }

  return (
    <div className="space-y-4">
      {sportTitle ? (
        <p className="text-muted-foreground text-xs font-medium">{sportTitle}</p>
      ) : null}
      {ageGroups.map((ageGroup) => {
        const ageRows = active.filter(
          (i) => (i.ageGroup?.trim() ?? "") === ageGroup,
        );
        return (
          <div key={ageGroup || "__none__"} className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold">
              {ageGroup || "묶음 미지정"}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {DIVISION_TEMPLATE_GENDERS.map((gender) => {
                const genderRows = ageRows.filter((i) => i.gender === gender);
                if (genderRows.length === 0) return null;
                return (
                  <div key={gender}>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      {DIVISION_TEMPLATE_GENDER_LABELS[gender]}
                    </p>
                    <ul className="space-y-0.5 text-xs">
                      {genderRows.map((row, idx) => (
                        <li key={idx}>
                          {formatDivisionMainLabel({
                            sportType: row.sportType ?? null,
                            ruleType: row.ruleType ?? null,
                            gender: row.gender ?? null,
                            ageGroup: row.ageGroup ?? null,
                            weightClass: row.weightClass ?? null,
                            weightClassName: row.weightClassName ?? null,
                            weightLimitText: row.weightLimitText ?? null,
                            skillLevel: row.skillLevel ?? null,
                          }) ||
                            buildWeightClassDisplay(row) ||
                            "—"}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
