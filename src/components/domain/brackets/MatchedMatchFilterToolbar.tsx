"use client";

import { useMemo } from "react";
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

export function MatchedMatchFilterToolbar({
  matches,
  options,
  filters,
  onFiltersChange,
  className,
  layout: _layout = "inline",
}: {
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
  filters: MatchedMatchFilterState;
  onFiltersChange: (next: MatchedMatchFilterState) => void;
  className?: string;
  /** workspace/inline 동일: 검색+필터 한 줄 */
  layout?: "inline" | "stack";
}) {
  const filterOptions = useMemo(
    () => buildMatchedMatchFilterOptions(matches, options),
    [matches, options],
  );
  const active = hasActiveMatchedMatchFilters(filters);

  function patch(partial: Partial<MatchedMatchFilterState>) {
    onFiltersChange({ ...filters, ...partial });
  }

  const searchInput = (
    <input
      className={COMPACT_FILTER_SEARCH_CLASS}
      placeholder="선수명 · 체육관"
      value={filters.search}
      onChange={(e) => patch({ search: e.target.value })}
      aria-label="잡힌 경기 검색"
    />
  );

  const filterControls = (
    <>
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
      <FilterMultiSelectButton
        label="경기구분"
        options={filterOptions.divisions}
        selected={filters.divisions}
        onChange={(divisions) => patch({ divisions })}
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
          onClick={() => onFiltersChange(DEFAULT_MATCHED_MATCH_FILTERS)}
        >
          초기화
        </Button>
      ) : null}
    </>
  );

  return (
    <div className={cn("min-w-0", className)}>
      <div className={COMPACT_FILTER_ROW_CLASS}>
        {searchInput}
        {filterControls}
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
