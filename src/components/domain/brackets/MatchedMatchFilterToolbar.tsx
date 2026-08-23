"use client";

import { useMemo, useState } from "react";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import {
  buildMatchedMatchFilterOptions,
  DEFAULT_MATCHED_MATCH_FILTERS,
  filterMatchedMatches,
  hasActiveMatchedMatchFilters,
  type MatchedMatchFilterState,
} from "@/lib/brackets/matched-match-filters";
import { formatUnmatchedWeightFilterLabel } from "@/lib/brackets/unmatched-candidate-filters";
import type { UnmatchedRecordStatusFilter } from "@/lib/brackets/unmatched-candidate-filters";
import { Button } from "@/components/ui/button";
import { formControlFieldCompactClass } from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";

const FILTER_SELECT_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-auto min-w-[5.5rem] shrink-0 rounded-md px-3 text-xs",
);

const SEARCH_INPUT_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-full min-w-0 max-w-[280px] shrink-0 basis-[240px] rounded-md px-3 text-xs sm:basis-[280px]",
);

function MultiSelectChips({
  label,
  options,
  selected,
  onChange,
  formatOption,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  formatOption?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  const active = selected.length > 0;

  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1 rounded-md px-3 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        {active ? (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] tabular-nums">
            {selected.length}
          </span>
        ) : null}
      </Button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-48 min-w-[10rem] overflow-y-auto rounded-md border bg-popover p-2 shadow-lg">
            <div className="mb-1 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-[11px]"
                onClick={() => onChange([...options])}
              >
                전체 선택
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-[11px]"
                onClick={() => onChange([])}
              >
                전체 해제
              </Button>
            </div>
            <ul className="space-y-1">
              {options.map((option) => (
                <li key={option}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted/60">
                    <input
                      type="checkbox"
                      className="size-3.5"
                      checked={selected.includes(option)}
                      onChange={() =>
                        onChange(
                          selected.includes(option)
                            ? selected.filter((item) => item !== option)
                            : [...selected, option],
                        )
                      }
                    />
                    <span className="min-w-0 truncate">
                      {formatOption ? formatOption(option) : option}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function MatchedMatchFilterToolbar({
  matches,
  options,
  filters,
  onFiltersChange,
  className,
}: {
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
  filters: MatchedMatchFilterState;
  onFiltersChange: (next: MatchedMatchFilterState) => void;
  className?: string;
}) {
  const filterOptions = useMemo(
    () => buildMatchedMatchFilterOptions(matches, options),
    [matches, options],
  );
  const active = hasActiveMatchedMatchFilters(filters);

  function patch(partial: Partial<MatchedMatchFilterState>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-start gap-2">
        <input
          className={SEARCH_INPUT_CLASS}
          placeholder="선수명 · 체육관 · 경기구분"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          aria-label="잡힌 경기 검색"
        />
        <MultiSelectChips
          label="체육관"
          options={filterOptions.gyms}
          selected={filters.gyms}
          onChange={(gyms) => patch({ gyms })}
        />
        <MultiSelectChips
          label="성별"
          options={filterOptions.genders}
          selected={filters.genders}
          onChange={(genders) => patch({ genders })}
        />
        <MultiSelectChips
          label="몸무게"
          options={filterOptions.weights.map(String)}
          selected={filters.weights.map(String)}
          onChange={(next) =>
            patch({
              weights: next
                .map((v) => Number(v))
                .filter((n) => Number.isFinite(n)),
            })
          }
          formatOption={(v) => formatUnmatchedWeightFilterLabel(Number(v))}
        />
        <MultiSelectChips
          label="학년"
          options={filterOptions.schoolGrades}
          selected={filters.schoolGrades}
          onChange={(schoolGrades) => patch({ schoolGrades })}
        />
        <MultiSelectChips
          label="경기구분"
          options={filterOptions.divisions}
          selected={filters.divisions}
          onChange={(divisions) => patch({ divisions })}
        />
        <select
          className={FILTER_SELECT_CLASS}
          value={filters.recordStatus}
          onChange={(e) =>
            patch({
              recordStatus: e.target.value as UnmatchedRecordStatusFilter,
              maxTotalBouts:
                e.target.value === "experienced" ? filters.maxTotalBouts : "",
            })
          }
          aria-label="전적 상태 필터"
        >
          <option value="all">전적 전체</option>
          <option value="zero">무전</option>
          <option value="experienced">유전</option>
        </select>
        {filters.recordStatus === "experienced" ? (
          <label className="flex h-9 shrink-0 items-center gap-1 text-xs">
            <span className="text-muted-foreground shrink-0">최대 총전</span>
            <input
              type="number"
              min={1}
              className={cn(formControlFieldCompactClass, "h-9 w-16 tabular-nums")}
              value={filters.maxTotalBouts}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  patch({ maxTotalBouts: "" });
                  return;
                }
                const n = Number.parseInt(raw, 10);
                if (!Number.isFinite(n) || n < 1) return;
                patch({ maxTotalBouts: String(n) });
              }}
              aria-label="최대 총전"
            />
          </label>
        ) : null}
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            onClick={() => onFiltersChange(DEFAULT_MATCHED_MATCH_FILTERS)}
          >
            초기화
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function useFilteredMatchedMatches(
  matches: OrganizerBracketMatchVM[],
  options: OrganizerApprovedFighterOptionVM[],
  filters: MatchedMatchFilterState,
) {
  return useMemo(
    () => filterMatchedMatches(matches, options, filters),
    [filters, matches, options],
  );
}
