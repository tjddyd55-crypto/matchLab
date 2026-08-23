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
import { formControlFieldCompactClass } from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";

const FILTER_BUTTON_CLASS =
  "h-9 shrink-0 gap-1 rounded-md px-3 text-xs font-medium";

const FILTER_SELECT_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-auto min-w-[5.5rem] shrink-0 rounded-md px-3 text-xs",
);

const SEARCH_INPUT_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-full min-w-0 max-w-[280px] shrink-0 basis-[280px] rounded-md px-3 text-xs sm:max-w-[320px] sm:basis-[320px]",
);

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
        className={FILTER_BUTTON_CLASS}
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
        className={FILTER_BUTTON_CLASS}
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

function UnmatchedSearchInput({
  filters,
  onFiltersChange,
  className,
}: {
  filters: UnmatchedQuickBarFilterState;
  onFiltersChange: (next: UnmatchedQuickBarFilterState) => void;
  className?: string;
}) {
  return (
    <input
      className={cn(SEARCH_INPUT_CLASS, className)}
      placeholder="선수명 · 체육관 검색"
      value={filters.search}
      onChange={(e) =>
        onFiltersChange({ ...filters, search: e.target.value })
      }
      aria-label="미매칭 선수 검색"
    />
  );
}

function UnmatchedFilterButtons({
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
        className={FILTER_SELECT_CLASS}
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
            step={1}
            inputMode="numeric"
            className={cn(formControlFieldCompactClass, "h-9 w-16 tabular-nums")}
            placeholder="—"
            value={filters.maxTotalBouts}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                patchFilters({ maxTotalBouts: "" });
                return;
              }
              const n = Number.parseInt(raw, 10);
              if (!Number.isFinite(n) || n < 1) return;
              patchFilters({ maxTotalBouts: String(n) });
            }}
            aria-label="최대 총전"
          />
          <span className="text-muted-foreground shrink-0">전 이하</span>
        </label>
      ) : null}
      {filtersActive ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 px-2 text-xs"
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
  layout?: "toolbar" | "stack";
}) {
  const filterOptions = buildUnmatchedQuickBarFilterOptions(options);
  const chips = buildUnmatchedQuickBarFilterChips(filters);

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      {layout === "stack" ? (
        <div className="space-y-2">
          <UnmatchedSearchInput
            filters={filters}
            onFiltersChange={onFiltersChange}
            className="max-w-none basis-auto"
          />
          <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [&>*]:shrink-0">
            <UnmatchedFilterButtons
              filterOptions={filterOptions}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-start gap-2">
          <UnmatchedSearchInput
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
          <UnmatchedFilterButtons
            filterOptions={filterOptions}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      )}
      {chips.length > 0 ? (
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
      ) : null}
    </div>
  );
}
