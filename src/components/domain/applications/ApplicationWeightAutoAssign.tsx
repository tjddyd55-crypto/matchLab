"use client";

import { useMemo } from "react";
import { parseApplicationWeightKg } from "@/lib/applications/application-weight";
import {
  formatResolvedDivisionPreview,
  resolveEventDivisionByApplicationWeight,
  type DivisionResolverCandidate,
} from "@/lib/applications/resolve-event-division";
import { cn } from "@/lib/utils";

export type ApplicationWeightAutoAssignDivision = DivisionResolverCandidate;

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

export function ApplicationWeightAutoAssign(props: {
  divisions: ApplicationWeightAutoAssignDivision[];
  gender: "male" | "female" | "";
  competitionCategory: string;
  discipline: string;
  applicationWeightKg: string;
  onCompetitionCategoryChange: (value: string) => void;
  onDisciplineChange: (value: string) => void;
  onApplicationWeightChange: (value: string) => void;
  fieldClass: string;
  labelClass: string;
  hiddenInputNames?: {
    competitionCategory?: string;
    discipline?: string;
    applicationWeightKg?: string;
    divisionId?: string;
  };
  defaultWeightHintKg?: number | null;
  showManualOverride?: boolean;
  manualOverride?: boolean;
  onManualOverrideChange?: (value: boolean) => void;
  manualDivisionId?: string;
  onManualDivisionIdChange?: (value: string) => void;
}) {
  const ageGroups = useMemo(
    () => uniqueSorted(props.divisions.map((d) => d.ageGroup)),
    [props.divisions],
  );
  const sports = useMemo(
    () => uniqueSorted(props.divisions.map((d) => d.sportType)),
    [props.divisions],
  );

  const parsedWeight = parseApplicationWeightKg(props.applicationWeightKg);
  const resolved =
    props.gender && props.competitionCategory && parsedWeight.ok
      ? resolveEventDivisionByApplicationWeight({
          gender: props.gender,
          competitionCategory: props.competitionCategory,
          discipline: props.discipline,
          applicationWeightKg: parsedWeight.kg,
          divisions: props.divisions,
        })
      : null;

  const names = props.hiddenInputNames;

  return (
    <div className="grid min-w-0 gap-3">
      <label className="block min-w-0 text-xs">
        <span className={props.labelClass}>경기구분 *</span>
        <select
          className={props.fieldClass}
          value={props.competitionCategory}
          onChange={(e) => props.onCompetitionCategoryChange(e.target.value)}
        >
          <option value="">선택…</option>
          {ageGroups.map((ageGroup) => (
            <option key={ageGroup} value={ageGroup}>
              {ageGroup}
            </option>
          ))}
        </select>
      </label>
      {sports.length > 1 ? (
        <label className="block min-w-0 text-xs">
          <span className={props.labelClass}>종목</span>
          <select
            className={props.fieldClass}
            value={props.discipline}
            onChange={(e) => props.onDisciplineChange(e.target.value)}
          >
            <option value="">전체</option>
            {sports.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block min-w-0 text-xs">
        <span className={props.labelClass}>신청체중 *</span>
        <input
          className={props.fieldClass}
          inputMode="decimal"
          placeholder="예: 62.5"
          value={props.applicationWeightKg}
          onChange={(e) => props.onApplicationWeightChange(e.target.value)}
        />
        <span className="text-muted-foreground mt-1 block text-[11px]">
          이번 대회 출전 신청 체중입니다. kg 단위.
          {props.defaultWeightHintKg != null
            ? ` 프로필 체중 ${props.defaultWeightHintKg}kg을 참고할 수 있습니다.`
            : ""}
        </span>
      </label>
      <div
        className={cn(
          "rounded-md border px-3 py-2 text-sm",
          resolved?.ok ? "bg-muted/30" : "border-amber-200 bg-amber-50",
        )}
      >
        <p className="text-muted-foreground text-[11px]">자동 배정 체급</p>
        {resolved?.ok ? (
          <p className="font-medium">
            {formatResolvedDivisionPreview(resolved.division)}
          </p>
        ) : (
          <p className="text-amber-800 text-xs">
            {props.applicationWeightKg.trim()
              ? resolved && !resolved.ok
                ? resolved.reason
                : "신청체중과 경기구분을 입력하면 체급이 표시됩니다."
              : "신청체중을 입력하면 체급이 표시됩니다."}
          </p>
        )}
      </div>
      {names?.competitionCategory ? (
        <input
          type="hidden"
          name={names.competitionCategory}
          value={props.competitionCategory}
        />
      ) : null}
      {names?.discipline ? (
        <input type="hidden" name={names.discipline} value={props.discipline} />
      ) : null}
      {names?.applicationWeightKg ? (
        <input
          type="hidden"
          name={names.applicationWeightKg}
          value={parsedWeight.ok ? String(parsedWeight.kg) : props.applicationWeightKg}
        />
      ) : null}
      {names?.divisionId ? (
        <input
          type="hidden"
          name={names.divisionId}
          value={
            props.manualOverride
              ? (props.manualDivisionId ?? "")
              : resolved?.ok
                ? resolved.division.id
                : ""
          }
        />
      ) : null}
      {props.showManualOverride ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="manualDivisionOverride"
              checked={props.manualOverride}
              onChange={(e) => props.onManualOverrideChange?.(e.target.checked)}
            />
            체급 수동 변경
          </label>
          {props.manualOverride ? (
            <select
              className={props.fieldClass}
              value={props.manualDivisionId}
              onChange={(e) => props.onManualDivisionIdChange?.(e.target.value)}
            >
              <option value="">체급 선택</option>
              {props.divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ageGroup} {d.weightClassName} {d.weightLimitText}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
