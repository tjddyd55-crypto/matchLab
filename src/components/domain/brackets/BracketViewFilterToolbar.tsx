"use client";

import { useMemo } from "react";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import {
  buildBracketViewFilterChips,
  buildBracketViewFilterOptions,
  DEFAULT_BRACKET_VIEW_FILTERS,
  formatBracketViewMatchCount,
  hasActiveBracketViewFilters,
  removeBracketViewFilterChip,
  type BracketViewFilterState,
} from "@/lib/brackets/bracket-view-filters";
import { formatUnmatchedWeightFilterLabel } from "@/lib/brackets/unmatched-candidate-filters";
import type { UnmatchedRecordStatusFilter } from "@/lib/brackets/unmatched-candidate-filters";
import { FilterMultiSelectButton } from "@/components/domain/brackets/FilterAnchoredDropdown";
import { Button } from "@/components/ui/button";
import {
  COMPACT_FILTER_BUTTON_CLASS,
  COMPACT_FILTER_RESET_CLASS,
  COMPACT_FILTER_ROW_CLASS,
  COMPACT_FILTER_SEARCH_CLASS,
  COMPACT_FILTER_SELECT_CLASS,
  COMPACT_NUMBER_INPUT_CLASS,
  sanitizePositiveIntInput,
} from "@/lib/ui/compact-filter-toolbar";
import { cn } from "@/lib/utils";

export function BracketViewFilterToolbar({
  matches,
  filters,
  onFiltersChange,
  visibleCount,
  className,
}: {
  matches: OrganizerEventMatchListItemVM[];
  filters: BracketViewFilterState;
  onFiltersChange: (next: BracketViewFilterState) => void;
  visibleCount: number;
  className?: string;
}) {
  const filterOptions = useMemo(
    () => buildBracketViewFilterOptions(matches),
    [matches],
  );
  const active = hasActiveBracketViewFilters(filters);
  const chips = useMemo(() => buildBracketViewFilterChips(filters), [filters]);
  const countLabel = formatBracketViewMatchCount({
    total: matches.length,
    visible: visibleCount,
    filtersActive: active,
  });

  function patch(partial: Partial<BracketViewFilterState>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs tabular-nums">{countLabel}</p>
      </div>

      <div className={COMPACT_FILTER_ROW_CLASS}>
        <input
          className={COMPACT_FILTER_SEARCH_CLASS}
          placeholder="선수명 · 체육관"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          aria-label="대진표 검색"
        />
        <FilterMultiSelectButton
          label="경기구분"
          options={filterOptions.divisions}
          selected={filters.divisions}
          onChange={(divisions) => patch({ divisions })}
          className={COMPACT_FILTER_BUTTON_CLASS}
        />
        <FilterMultiSelectButton
          label="체육관"
          options={filterOptions.gyms}
          selected={filters.gyms}
          onChange={(gyms) => patch({ gyms })}
          className={COMPACT_FILTER_BUTTON_CLASS}
        />
        <FilterMultiSelectButton
          label="성별"
          options={filterOptions.genders}
          selected={filters.genders}
          onChange={(genders) => patch({ genders })}
          className={COMPACT_FILTER_BUTTON_CLASS}
        />
        <FilterMultiSelectButton
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
          className={COMPACT_FILTER_BUTTON_CLASS}
        />
        <FilterMultiSelectButton
          label="학년"
          options={filterOptions.schoolGrades}
          selected={filters.schoolGrades}
          onChange={(schoolGrades) => patch({ schoolGrades })}
          className={COMPACT_FILTER_BUTTON_CLASS}
        />
        <select
          className={COMPACT_FILTER_SELECT_CLASS}
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
          <option value="all">전체</option>
          <option value="zero">무전</option>
          <option value="experienced">유전</option>
        </select>
        {filters.recordStatus === "experienced" ? (
          <input
            type="text"
            inputMode="numeric"
            className={COMPACT_NUMBER_INPUT_CLASS}
            value={filters.maxTotalBouts}
            placeholder="—"
            onChange={(e) => {
              const next = sanitizePositiveIntInput(e.target.value);
              if (next == null) return;
              patch({ maxTotalBouts: next });
            }}
            aria-label="최대 총전"
          />
        ) : null}
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={COMPACT_FILTER_RESET_CLASS}
            onClick={() => onFiltersChange(DEFAULT_BRACKET_VIEW_FILTERS)}
          >
            초기화
          </Button>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="bg-muted text-muted-foreground hover:bg-muted/80 inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px]"
              onClick={() =>
                onFiltersChange(removeBracketViewFilterChip(filters, chip.key))
              }
              aria-label={`${chip.label} 필터 제거`}
            >
              {chip.label}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
