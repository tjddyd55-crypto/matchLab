"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import {
  BracketFighterCompactBadge,
  BracketFighterCompactCard,
} from "@/components/domain/brackets/BracketFighterCompactCard";
import {
  UnmatchedDraggableCardShell,
  type ManualMatchPickSlot,
} from "@/components/domain/brackets/ManualMatchCreatePanel";
import { buildBracketCandidateWeightRecordDisplay } from "@/lib/bracket-fighter-assignment";
import { resolveCandidateStatusBadge } from "@/lib/bracket-fighter-compact-display";
import {
  buildUnmatchedQuickBarFilterChips,
  buildUnmatchedQuickBarFilterOptions,
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  filterUnmatchedQuickBarOptions,
  formatUnmatchedWeightFilterLabel,
  hasActiveUnmatchedQuickBarFilters,
  type UnmatchedQuickBarFilterState,
  type UnmatchedRecordStatusFilter,
} from "@/lib/brackets/unmatched-candidate-filters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formControlFieldCompactClass } from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";

function candidateDivisionMeta(
  option: OrganizerApprovedFighterOptionVM,
): string | undefined {
  const label = option.isOtherDivision
    ? option.currentDivisionLabel
    : option.appliedDivisionLabel;
  return label || undefined;
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

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
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        {!allSelected ? (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
            {selected.length}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[10rem] rounded-md border bg-popover p-2 shadow-lg">
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
          <ul className="max-h-48 space-y-1 overflow-y-auto">
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
        </div>
      ) : null}
    </div>
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

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
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        몸무게
        {!allSelected ? (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
            {selected.length}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[10rem] rounded-md border bg-popover p-2 shadow-lg">
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
          <ul className="max-h-48 space-y-1 overflow-y-auto">
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
        </div>
      ) : null}
    </div>
  );
}

export function EventWideUnmatchedQuickBar({
  options,
  slotIds,
  activePickSlot,
  onCardClick,
  onAssignRed,
  onAssignBlue,
  onDragStart,
}: {
  options: OrganizerApprovedFighterOptionVM[];
  slotIds: Set<string>;
  activePickSlot: ManualMatchPickSlot | null;
  onCardClick: (option: OrganizerApprovedFighterOptionVM) => void;
  onAssignRed: (option: OrganizerApprovedFighterOptionVM) => void;
  onAssignBlue: (option: OrganizerApprovedFighterOptionVM) => void;
  onDragStart?: () => void;
}) {
  const [filters, setFilters] = useState<UnmatchedQuickBarFilterState>(
    DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  );

  const filterOptions = useMemo(
    () => buildUnmatchedQuickBarFilterOptions(options),
    [options],
  );

  const filtered = useMemo(
    () => filterUnmatchedQuickBarOptions(options, filters),
    [filters, options],
  );

  const chips = useMemo(() => buildUnmatchedQuickBarFilterChips(filters), [filters]);
  const filtersActive = hasActiveUnmatchedQuickBarFilters(filters);

  function patchFilters(patch: Partial<UnmatchedQuickBarFilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function resetFilters() {
    setFilters(DEFAULT_UNMATCHED_QUICK_BAR_FILTERS);
  }

  return (
    <section className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          미매칭 선수{" "}
          <span className="text-muted-foreground font-normal tabular-nums">
            {filtered.length}명
          </span>
        </h3>
        {filtersActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={resetFilters}
          >
            초기화
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={cn(formControlFieldCompactClass, "min-w-[12rem] flex-1")}
          placeholder="선수명 · 체육관 · 경기구분"
          value={filters.search}
          onChange={(e) => patchFilters({ search: e.target.value })}
        />
        <MultiCheckFilterDropdown
          label="부문"
          options={filterOptions.ageGroups}
          selected={filters.ageGroups}
          onChange={(ageGroups) => patchFilters({ ageGroups })}
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
          className={cn(formControlFieldCompactClass, "h-8 w-auto min-w-[5.5rem]")}
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
          <label className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground shrink-0">최대 총전</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              className={cn(formControlFieldCompactClass, "h-8 w-16 tabular-nums")}
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
      </div>

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

      {activePickSlot ? (
        <p className="text-primary text-xs font-medium">
          {activePickSlot === "red" ? "홍코너" : "청코너"} 선택 중 — 아래 선수를
          클릭하세요
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded border border-dashed px-3 py-2 text-center text-xs">
          조건에 맞는 선수가 없습니다.
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {filtered.map((o) => {
            const inSlot = slotIds.has(o.fighterId);
            const statusBadge = resolveCandidateStatusBadge(o);
            const weightRecordStats = buildBracketCandidateWeightRecordDisplay(o);
            return (
              <UnmatchedDraggableCardShell
                key={o.applicationId}
                fighterId={o.fighterId}
                inSlot={inSlot}
                onDragStart={onDragStart}
              >
                <button
                  type="button"
                  className={cn(
                    "min-w-[240px] max-w-[280px] text-left",
                    activePickSlot && !inSlot ? "cursor-pointer" : undefined,
                  )}
                  onClick={() => {
                    if (inSlot) return;
                    onCardClick(o);
                  }}
                >
                  <BracketFighterCompactCard
                    fighterName={o.fighterName}
                    gymName={o.gymName}
                    metaLine={candidateDivisionMeta(o)}
                    weightRecordStats={weightRecordStats}
                    statusBadges={
                      <div className="flex flex-wrap items-center gap-1">
                        {o.isOtherDivision ? (
                          <BracketFighterCompactBadge
                            label="다른 경기구분"
                            variant="warning"
                          />
                        ) : null}
                        <BracketFighterCompactBadge
                          label={statusBadge.label}
                          variant={statusBadge.variant}
                          title={statusBadge.title}
                        />
                      </div>
                    }
                  />
                </button>
                {!inSlot ? (
                  <div className="mt-1 flex gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="flex-1"
                      aria-label={`${o.fighterName} 홍코너에 배정`}
                      onClick={() => onAssignRed(o)}
                    >
                      홍
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="flex-1"
                      aria-label={`${o.fighterName} 청코너에 배정`}
                      onClick={() => onAssignBlue(o)}
                    >
                      청
                    </Button>
                  </div>
                ) : null}
              </UnmatchedDraggableCardShell>
            );
          })}
        </ul>
      )}
    </section>
  );
}
