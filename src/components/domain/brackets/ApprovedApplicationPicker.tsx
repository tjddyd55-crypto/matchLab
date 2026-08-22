"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { FighterPickerOptionState } from "@/lib/bracket-fighter-picker";
import {
  buildPickerOptionColumns,
  getPickerOptionSortTier,
  type PickerOptionColumns,
} from "@/lib/bracket-fighter-assignment";
import { formatFighterInlineIdentity } from "@/components/domain/brackets/BracketFighterInlineIdentity";
import { BracketFighterCompactBadge } from "@/components/domain/brackets/BracketFighterCompactCard";
import {
  nowrapTruncateClass,
  shortenAssignabilityReason,
} from "@/lib/ui/match-grid-layout";
import { organizerBracketFieldSelectClass } from "@/lib/ui/organizer-bracket-ui";
import { cn } from "@/lib/utils";

const PICKER_GRID_CLASS =
  "grid w-full min-w-0 grid-cols-[7.5rem_minmax(9rem,1.4fr)_minmax(7rem,1fr)_3.5rem_minmax(5.5rem,1fr)] items-center gap-x-2";

type ResolvedPickerOption = {
  option: OrganizerApprovedFighterOptionVM;
  selectable: boolean;
  reason?: string;
  warningReason?: string;
  columns: PickerOptionColumns;
  title: string;
  mode: "current" | "normal" | "empty";
};

function resolveOptionMeta(
  o: OrganizerApprovedFighterOptionVM,
  input: {
    optionStates?: Map<string, FighterPickerOptionState>;
    disabledOptionIds?: ReadonlySet<string>;
    activeFighterId: string;
  },
) {
  const state = input.optionStates?.get(o.fighterId);
  const disabledByLegacy = input.disabledOptionIds?.has(o.fighterId);
  const selectable =
    state?.selectable ?? (!disabledByLegacy && o.isAssignableForBracket);
  const reason = state?.reason;
  const warningReason = state?.warningReason ?? o.assignabilityWarningReason;
  const status =
    state?.pickerStatus ??
    (state?.assignmentSummary === "미배정"
      ? "미배정"
      : state?.assignmentSummary ?? "미배정");
  const columns = buildPickerOptionColumns(o, status);
  const identity =
    formatFighterInlineIdentity(o.gymName, o.fighterName) || o.label;
  const title = [
    columns.status,
    identity,
    columns.divisionLabel,
    columns.weightLabel,
    columns.recordLabel,
    !selectable ? reason : warningReason ?? reason,
  ]
    .filter(Boolean)
    .join(" · ");

  return { selectable, reason, warningReason, columns, title };
}

function PickerGridHeader() {
  return (
    <div
      className={cn(
        PICKER_GRID_CLASS,
        "text-muted-foreground hidden border-b px-2 py-1.5 text-[10px] font-medium sm:grid",
      )}
      aria-hidden
    >
      <span>상태</span>
      <span>선수</span>
      <span>경기구분</span>
      <span className="text-right">체중</span>
      <span>전적</span>
    </div>
  );
}

function PickerGridRowMobile({ columns }: { columns: PickerOptionColumns }) {
  return (
    <div className="min-w-0 space-y-0.5 sm:hidden">
      <p className="truncate text-xs">
        <span className="text-muted-foreground">{columns.status}</span>{" "}
        <span className="font-medium">{columns.fighterName}</span>
      </p>
      <p className="text-muted-foreground truncate text-[11px]">
        {columns.gymName} · {columns.divisionLabel} · {columns.weightLabel}
      </p>
      <p className="text-muted-foreground truncate text-[11px]">
        {columns.recordLabel}
      </p>
    </div>
  );
}

function PickerGridRowDesktop({
  columns,
  selectable,
}: {
  columns: PickerOptionColumns;
  selectable: boolean;
}) {
  return (
    <div className={cn(PICKER_GRID_CLASS, "hidden min-w-0 sm:grid")}>
      <span
        className={cn(
          "truncate text-[11px]",
          selectable ? "text-muted-foreground" : "text-muted-foreground/70",
        )}
        title={columns.status}
      >
        {columns.status}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{columns.fighterName}</p>
        <p className="text-muted-foreground truncate text-[10px]">
          {columns.gymName}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px]" title={columns.divisionLabel}>
          {columns.divisionLabel}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {columns.isOtherDivision ? (
            <BracketFighterCompactBadge
              label="다른 경기구분"
              variant="warning"
            />
          ) : null}
          {!columns.isEligibleForBracket ? (
            <BracketFighterCompactBadge label="현장 미확인" variant="warning" />
          ) : null}
        </div>
      </div>
      <span className="truncate text-right text-[11px] tabular-nums">
        {columns.weightLabel}
      </span>
      <span
        className="truncate text-[11px] tabular-nums"
        title={columns.recordLabel}
      >
        {columns.recordLabel}
      </span>
    </div>
  );
}

function PickerGridRow({
  columns,
  selectable,
  warningReason,
}: {
  columns: PickerOptionColumns;
  selectable: boolean;
  warningReason?: string;
}) {
  return (
    <>
      <PickerGridRowDesktop columns={columns} selectable={selectable} />
      <PickerGridRowMobile columns={columns} />
      {warningReason ? (
        <p className="text-amber-700 dark:text-amber-300 mt-0.5 truncate text-[10px]">
          ⚠ {shortenAssignabilityReason(warningReason)}
        </p>
      ) : null}
    </>
  );
}

export function ApprovedApplicationPicker({
  name,
  value,
  onChange,
  options,
  optionStates,
  disabledOptionIds,
  placeholder,
  required,
  disabled,
  className,
  currentFighterId,
}: {
  name?: string;
  value: string;
  onChange?: (fighterId: string) => void;
  options: OrganizerApprovedFighterOptionVM[];
  optionStates?: Map<string, FighterPickerOptionState>;
  /** @deprecated optionStates 사용 */
  disabledOptionIds?: ReadonlySet<string>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** 현재 슬롯 선수 — 미지정 시 `value`와 동일 */
  currentFighterId?: string;
}) {
  const triggerClass = cn(
    organizerBracketFieldSelectClass,
    "flex h-8 w-full min-w-0 max-w-full items-center justify-between gap-2 px-2 text-left text-xs shadow-sm",
    nowrapTruncateClass,
    className,
  );
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);

  const activeFighterId = currentFighterId ?? value ?? internalValue;

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const resolvedOptions = useMemo((): ResolvedPickerOption[] => {
    const metaInput = { optionStates, disabledOptionIds, activeFighterId };
    const currentOption = activeFighterId
      ? options.find((o) => o.fighterId === activeFighterId)
      : undefined;
    const rest = options.filter((o) => o.fighterId !== activeFighterId);

    const sortedRest = [...rest].sort((a, b) => {
      const stateA = optionStates?.get(a.fighterId);
      const stateB = optionStates?.get(b.fighterId);
      const tierA = getPickerOptionSortTier({
        fighterId: a.fighterId,
        activeFighterId,
        isOtherDivision: a.isOtherDivision,
        assignmentCount: stateA?.assignmentCount ?? 0,
      });
      const tierB = getPickerOptionSortTier({
        fighterId: b.fighterId,
        activeFighterId,
        isOtherDivision: b.isOtherDivision,
        assignmentCount: stateB?.assignmentCount ?? 0,
      });
      if (tierA !== tierB) return tierA - tierB;
      return a.fighterName.localeCompare(b.fighterName, "ko");
    });

    const rows: ResolvedPickerOption[] = [];

    if (currentOption) {
      const meta = resolveOptionMeta(currentOption, metaInput);
      rows.push({
        option: currentOption,
        ...meta,
        mode: "current",
      });
    }

    rows.push({
      option: {
        fighterId: "",
        applicationId: "",
        label: placeholder ?? "빈 슬롯",
        divisionId: null,
        divisionLabel: "",
        appliedDivisionLabel: "",
        currentDivisionLabel: "",
        isOtherDivision: false,
        division: {
          sportType: null,
          ruleType: null,
          gender: null,
          ageGroup: null,
          weightClass: null,
          skillLevel: null,
        },
        fighterName: placeholder ?? "빈 슬롯",
        gymName: "",
        fighterGender: null,
        isEligibleForBracket: true,
        eligibilityLabel: "",
        eligibilityReason: "",
        isAssignableForBracket: true,
        assignabilityLabel: "",
        recordSummary: "",
        applicationWeightKg: null,
      },
      selectable: true,
      columns: buildPickerOptionColumns(
        {
          fighterName: placeholder ?? "빈 슬롯",
          gymName: "",
          currentDivisionLabel: "",
          appliedDivisionLabel: "",
          applicationWeightKg: null,
          recordSummary: "",
          isOtherDivision: false,
          isEligibleForBracket: true,
        },
        "빈 슬롯",
      ),
      title: placeholder ?? "빈 슬롯",
      mode: "empty",
    });

    for (const o of sortedRest) {
      const meta = resolveOptionMeta(o, metaInput);
      rows.push({
        option: o,
        ...meta,
        mode: "normal",
      });
    }

    return rows;
  }, [
    activeFighterId,
    disabledOptionIds,
    optionStates,
    options,
    placeholder,
  ]);

  const selectedRow =
    resolvedOptions.find(
      (row) => row.mode !== "empty" && row.option.fighterId === activeFighterId,
    ) ??
    resolvedOptions.find((row) => row.mode === "empty") ??
    null;

  function commit(nextId: string) {
    setInternalValue(nextId);
    onChange?.(nextId);
    setOpen(false);
  }

  const triggerLabel = selectedRow
    ? `${selectedRow.columns.status} · ${selectedRow.columns.fighterName}`
    : placeholder ?? "빈 슬롯";

  return (
    <div ref={rootRef} className="relative min-w-0">
      {name ? (
        <input type="hidden" name={name} value={internalValue} required={required} />
      ) : null}

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={cn(
          triggerClass,
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <span className="text-muted-foreground shrink-0 text-[10px]" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-[min(100vw-2rem,36rem)] min-w-full overflow-y-auto overflow-x-hidden rounded-md border bg-popover py-1 shadow-md"
        >
          <PickerGridHeader />
          <ul className="divide-y divide-border/60">
            {resolvedOptions.map((row) => {
              const isSelected =
                row.mode === "empty"
                  ? !activeFighterId
                  : row.option.fighterId === activeFighterId;
              const isDisabled =
                row.mode !== "empty" &&
                !row.selectable &&
                row.option.fighterId !== activeFighterId;

              return (
                <li key={row.mode === "empty" ? "__empty__" : row.option.fighterId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={isDisabled}
                    title={row.title}
                    className={cn(
                      "w-full px-2 py-2 text-left transition-colors hover:bg-muted/60",
                      isSelected && "bg-primary/5",
                      isDisabled && "cursor-not-allowed opacity-50",
                      row.warningReason &&
                        row.selectable &&
                        "bg-amber-50/40 dark:bg-amber-950/20",
                    )}
                    onClick={() => {
                      if (isDisabled) return;
                      commit(row.mode === "empty" ? "" : row.option.fighterId);
                    }}
                  >
                    <PickerGridRow
                      columns={row.columns}
                      selectable={row.selectable}
                      warningReason={
                        row.mode === "normal" ? row.warningReason : undefined
                      }
                    />
                    {row.mode === "normal" && !row.selectable && row.reason ? (
                      <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                        {shortenAssignabilityReason(row.reason)}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
