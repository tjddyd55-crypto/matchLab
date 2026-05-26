"use client";

import { useState } from "react";
import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import {
  DIVISION_TEMPLATE_AGE_GROUPS,
  DIVISION_TEMPLATE_GENDER_LABELS,
  DIVISION_TEMPLATE_GENDERS,
  type DivisionTemplateAgeGroup,
  type DivisionTemplateGender,
} from "@/lib/division-template/division-template-constants";
import { parseQuickWeightClassInput } from "@/lib/division-template/division-template-parse";
import { buildWeightClassDisplay } from "@/lib/division-template/division-template-row";
import { Button } from "@/components/ui/button";

function rowsFor(
  items: DivisionTemplateItemInput[],
  ageGroup: string,
  gender: DivisionTemplateGender,
) {
  return items.filter(
    (i) => i.ageGroup === ageGroup && i.gender === gender && i.isActive !== false,
  );
}

function replaceSectionRows(
  items: DivisionTemplateItemInput[],
  ageGroup: string,
  gender: DivisionTemplateGender,
  nextSectionRows: DivisionTemplateItemInput[],
): DivisionTemplateItemInput[] {
  const others = items.filter(
    (i) => !(i.ageGroup === ageGroup && i.gender === gender),
  );
  return [...others, ...nextSectionRows];
}

function GenderSection({
  sportType,
  ageGroup,
  gender,
  rows,
  onChange,
}: {
  sportType: string;
  ageGroup: DivisionTemplateAgeGroup;
  gender: DivisionTemplateGender;
  rows: DivisionTemplateItemInput[];
  onChange: (next: DivisionTemplateItemInput[]) => void;
}) {
  const [quickText, setQuickText] = useState("");

  const updateRow = (idx: number, patch: Partial<DivisionTemplateItemInput>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const duplicateRow = (idx: number) => {
    const src = rows[idx];
    if (!src) return;
    const dup: DivisionTemplateItemInput = {
      ...src,
      weightClassName: `${src.weightClassName ?? ""} (복제)`,
      weightClass: buildWeightClassDisplay({
        ...src,
        weightClassName: `${src.weightClassName ?? ""} (복제)`,
      }),
      displayOrder: (src.displayOrder ?? 0) + 1,
    };
    onChange([...rows.slice(0, idx + 1), dup, ...rows.slice(idx + 1)]);
  };

  const addEmptyRow = () => {
    onChange([
      ...rows,
      {
        sportType,
        ruleType: null,
        gender,
        ageGroup,
        weightClassName: "",
        weightLimitText: null,
        weightLimitKg: null,
        limitType: null,
        weightClass: null,
        skillLevel: null,
        displayOrder: rows.length,
        isActive: true,
      },
    ]);
  };

  function applyQuickInput() {
    if (!quickText.trim()) return;
    const parsed = parseQuickWeightClassInput(quickText, {
      sportType,
      ageGroup,
      gender,
      startOrder: rows.length,
    });
    onChange([...rows, ...parsed]);
    setQuickText("");
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <h4 className="text-sm font-medium">
        {DIVISION_TEMPLATE_GENDER_LABELS[gender]}
      </h4>
      <div className="space-y-2">
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">빠른 입력 (/ 로 구분)</span>
          <textarea
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            rows={2}
            placeholder="핀급 -30kg / 라이트플라이급 -32kg / 플라이급 -34kg"
            className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-xs"
          />
        </label>
        <Button type="button" size="sm" variant="secondary" onClick={applyQuickInput}>
          빠른 입력 반영
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-2 py-2 font-medium">체급명</th>
              <th className="px-2 py-2 font-medium">체중 기준</th>
              <th className="w-[120px] px-2 py-2 font-medium">동작</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted-foreground px-2 py-3">
                  체급이 없습니다. 빠른 입력 또는 행 추가를 사용하세요.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`${ageGroup}-${gender}-${idx}`} className="border-b">
                  <td className="px-2 py-1">
                    <input
                      className="border-input bg-background h-8 w-full rounded border px-2"
                      value={row.weightClassName ?? ""}
                      onChange={(e) => {
                        const weightClassName = e.target.value;
                        updateRow(idx, {
                          weightClassName,
                          weightClass: buildWeightClassDisplay({
                            ...row,
                            weightClassName,
                          }),
                        });
                      }}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border-input bg-background h-8 w-full rounded border px-2 font-mono"
                      value={row.weightLimitText ?? ""}
                      placeholder="-30kg"
                      onChange={(e) => {
                        const weightLimitText = e.target.value || null;
                        updateRow(idx, {
                          weightLimitText,
                          weightClass: buildWeightClassDisplay({
                            ...row,
                            weightLimitText,
                          }),
                        });
                      }}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => duplicateRow(idx)}
                      >
                        복제
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => removeRow(idx)}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addEmptyRow}>
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
  return (
    <div className="space-y-6">
      {DIVISION_TEMPLATE_AGE_GROUPS.map((ageGroup) => (
        <section key={ageGroup} className="space-y-3">
          <h3 className="text-base font-semibold">{ageGroup}</h3>
          <div className="grid gap-6 xl:grid-cols-2">
            {DIVISION_TEMPLATE_GENDERS.map((gender) => (
              <GenderSection
                key={`${ageGroup}-${gender}`}
                sportType={sportType}
                ageGroup={ageGroup}
                gender={gender}
                rows={rowsFor(items, ageGroup, gender)}
                onChange={(sectionRows) =>
                  onChange(replaceSectionRows(items, ageGroup, gender, sectionRows))
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

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

  return (
    <div className="space-y-4">
      {DIVISION_TEMPLATE_AGE_GROUPS.map((ageGroup) => {
        const ageRows = active.filter((i) => i.ageGroup === ageGroup);
        if (ageRows.length === 0) return null;
        return (
          <div key={ageGroup} className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold">{ageGroup}</h4>
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
                        <li key={idx} className="font-mono">
                          {buildWeightClassDisplay(row) || "—"}
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
      {sportType ? (
        <p className="text-muted-foreground text-xs">종목: {sportType}</p>
      ) : null}
    </div>
  );
}
