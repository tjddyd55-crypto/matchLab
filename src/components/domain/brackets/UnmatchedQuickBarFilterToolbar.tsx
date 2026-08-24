"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import {
  buildUnmatchedQuickBarFilterChips,
  buildUnmatchedQuickBarFilterOptions,
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  formatUnmatchedWeightFilterLabel,
  hasActiveUnmatchedQuickBarFilters,
  type UnmatchedQuickBarFilterState,
  type UnmatchedRecordStatusFilter,
} from "@/lib/brackets/unmatched-candidate-filters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  COMPACT_FILTER_BUTTON_CLASS,
  COMPACT_FILTER_RESET_CLASS,
  COMPACT_FILTER_ROW_CLASS,
  COMPACT_FILTER_SEARCH_NARROW_CLASS,
  COMPACT_FILTER_SEARCH_STACKED_NARROW_CLASS,
  COMPACT_FILTER_STACK_CLASS,
  COMPACT_FILTER_SELECT_CLASS,
  COMPACT_NUMBER_INPUT_CLASS,
  sanitizePositiveIntInput,
} from "@/lib/ui/compact-filter-toolbar";
import { cn } from "@/lib/utils";

function useAnchoredPanelStyle(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelWidth = 280,
) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const margin = 8;
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - panelWidth - margin);
    }

    setStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left,
      width: panelWidth,
      zIndex: 80,
      visibility: "visible",
    });
  }, [anchorRef, open, panelWidth]);

  return style;
}

function FilterDropdownPanel({
  open,
  anchorRef,
  children,
  onClose,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const style = useAnchoredPanelStyle(open, anchorRef);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" aria-hidden onClick={onClose} />
      <div
        style={style}
        className="rounded-md border bg-popover p-2 shadow-lg"
        role="dialog"
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

function MultiCheckFilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  if (options.length === 0) return null;

  const allSelected = selected.length === 0;

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <>
      <Button
        ref={anchorRef}
        type="button"
        variant="outline"
        size="sm"
        className={COMPACT_FILTER_BUTTON_CLASS}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        {!allSelected ? (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
            {selected.length}
          </span>
        ) : null}
      </Button>
      <FilterDropdownPanel
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
      >
        <div className="mb-2 flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 px-2 text-[11px]"
            onClick={() => onChange([...options])}
          >
            전체 선택
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 px-2 text-[11px]"
            onClick={() => onChange([])}
          >
            전체 해제
          </Button>
        </div>
        <ul className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">
          {options.map((option) => (
            <li key={option}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted/60">
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggle(option)}
                  aria-label={`${label} ${option}`}
                />
                <span className="min-w-0 truncate">{option}</span>
              </label>
            </li>
          ))}
        </ul>
      </FilterDropdownPanel>
    </>
  );
}

function WeightMultiCheckFilterDropdown({
  options,
  selected,
  onChange,
}: {
  options: number[];
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  if (options.length === 0) return null;

  const allSelected = selected.length === 0;

  function toggle(value: number) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <>
      <Button
        ref={anchorRef}
        type="button"
        variant="outline"
        size="sm"
        className={COMPACT_FILTER_BUTTON_CLASS}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        몸무게
        {!allSelected ? (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
            {selected.length}
          </span>
        ) : null}
      </Button>
      <FilterDropdownPanel
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
      >
        <div className="mb-2 flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 px-2 text-[11px]"
            onClick={() => onChange([...options])}
          >
            전체 선택
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 px-2 text-[11px]"
            onClick={() => onChange([])}
          >
            전체 해제
          </Button>
        </div>
        <ul className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">
          {options.map((option) => (
            <li key={option}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted/60">
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggle(option)}
                  aria-label={`몸무게 ${formatUnmatchedWeightFilterLabel(option)}`}
                />
                <span className="tabular-nums">
                  {formatUnmatchedWeightFilterLabel(option)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </FilterDropdownPanel>
    </>
  );
}

function UnmatchedFilterControls({
  filterOptions,
  filters,
  onFiltersChange,
}: {
  filterOptions: ReturnType<typeof buildUnmatchedQuickBarFilterOptions>;
  filters: UnmatchedQuickBarFilterState;
  onFiltersChange: (next: UnmatchedQuickBarFilterState) => void;
}) {
  const filtersActive = hasActiveUnmatchedQuickBarFilters(filters);

  function patchFilters(patch: Partial<UnmatchedQuickBarFilterState>) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <>
      <MultiCheckFilterDropdown
        label="부문"
        options={filterOptions.ageGroups}
        selected={filters.ageGroups}
        onChange={(ageGroups) => patchFilters({ ageGroups })}
      />
      <MultiCheckFilterDropdown
        label="체육관"
        options={filterOptions.gyms}
        selected={filters.gyms}
        onChange={(gyms) => patchFilters({ gyms })}
      />
      <MultiCheckFilterDropdown
        label="학년"
        options={filterOptions.schoolGrades}
        selected={filters.schoolGrades}
        onChange={(schoolGrades) => patchFilters({ schoolGrades })}
      />
      <MultiCheckFilterDropdown
        label="성별"
        options={filterOptions.genders}
        selected={filters.genders}
        onChange={(genders) => patchFilters({ genders })}
      />
      <WeightMultiCheckFilterDropdown
        options={filterOptions.weights}
        selected={filters.weights}
        onChange={(weights) => patchFilters({ weights })}
      />
      <select
        className={COMPACT_FILTER_SELECT_CLASS}
        value={filters.recordStatus}
        onChange={(e) =>
          patchFilters({
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
          placeholder="—"
          value={filters.maxTotalBouts}
          onChange={(e) => {
            const next = sanitizePositiveIntInput(e.target.value);
            if (next == null) return;
            patchFilters({ maxTotalBouts: next });
          }}
          aria-label="최대 총전"
        />
      ) : null}
      {filtersActive ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={COMPACT_FILTER_RESET_CLASS}
          onClick={() => onFiltersChange(DEFAULT_UNMATCHED_QUICK_BAR_FILTERS)}
        >
          초기화
        </Button>
      ) : null}
    </>
  );
}

export function UnmatchedQuickBarFilterToolbar({
  options,
  filters,
  onFiltersChange,
  className,
  layout = "toolbar",
}: {
  options: OrganizerApprovedFighterOptionVM[];
  filters: UnmatchedQuickBarFilterState;
  onFiltersChange: (next: UnmatchedQuickBarFilterState) => void;
  className?: string;
  /** stack: 검색 1행 + 필터 1행 / toolbar: 한 줄 */
  layout?: "toolbar" | "stack";
}) {
  const filterOptions = buildUnmatchedQuickBarFilterOptions(options);
  const chips = buildUnmatchedQuickBarFilterChips(filters);

  const searchInput = (
    <input
      className={
        layout === "stack"
          ? COMPACT_FILTER_SEARCH_STACKED_NARROW_CLASS
          : COMPACT_FILTER_SEARCH_NARROW_CLASS
      }
      placeholder="선수명 · 체육관"
      value={filters.search}
      onChange={(e) =>
        onFiltersChange({ ...filters, search: e.target.value })
      }
      aria-label="미매칭 선수 검색"
    />
  );

  const chipRow =
    chips.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {chips.map((chip) => (
          <span
            key={chip}
            className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[11px]"
          >
            {chip}
          </span>
        ))}
      </div>
    ) : null;

  if (layout === "stack") {
    return (
      <div className={cn(COMPACT_FILTER_STACK_CLASS, className)} data-layout={layout}>
        {searchInput}
        <div className={COMPACT_FILTER_ROW_CLASS}>
          <UnmatchedFilterControls
            filterOptions={filterOptions}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        </div>
        {chipRow}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-2", className)} data-layout={layout}>
      <div className={COMPACT_FILTER_ROW_CLASS}>
        {searchInput}
        <UnmatchedFilterControls
          filterOptions={filterOptions}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      </div>
      {chipRow}
    </div>
  );
}
