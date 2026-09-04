"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import { createPortal } from "react-dom";
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

export const PICKER_GRID_CLASS =
  "grid w-full min-w-0 grid-cols-[5.5rem_minmax(7.5rem,1.4fr)_minmax(6.25rem,1fr)_3.5rem_minmax(5rem,1fr)] items-center gap-x-2";

const POPUP_MAX_HEIGHT = 320;
const POPUP_Z_INDEX = 100;

type PopupPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

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
        "text-muted-foreground hidden border-b bg-popover px-2 py-1.5 text-[10px] font-medium sm:grid",
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
    <div className="min-h-[52px] py-1">
      <PickerGridRowDesktop columns={columns} selectable={selectable} />
      <PickerGridRowMobile columns={columns} />
      {warningReason ? (
        <p className="text-amber-700 dark:text-amber-300 mt-0.5 truncate text-[10px]">
          ⚠ {shortenAssignabilityReason(warningReason)}
        </p>
      ) : null}
    </div>
  );
}

function computePopupPosition(trigger: HTMLElement): PopupPosition {
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const width = Math.min(Math.max(rect.width, 0), viewportW - margin * 2);

  let left = rect.left;
  if (left + width > viewportW - margin) {
    left = Math.max(margin, viewportW - margin - width);
  }
  if (left < margin) left = margin;

  const spaceBelow = viewportH - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const openBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
  const maxHeight = Math.min(
    POPUP_MAX_HEIGHT,
    openBelow ? spaceBelow - 4 : spaceAbove - 4,
  );
  const top = openBelow
    ? rect.bottom + 4
    : Math.max(margin, rect.top - maxHeight - 4);

  return { top, left, width, maxHeight: Math.max(160, maxHeight) };
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  const activeFighterId = currentFighterId ?? value ?? internalValue;

  useEffect(() => {
    scheduleEffectStateUpdate(() => {
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    scheduleEffectStateUpdate(() => {
      setInternalValue(value);
    });
  }, [value]);

  const updatePopupPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setPopupPosition(computePopupPosition(triggerRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [open, updatePopupPosition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
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
        schoolLevel: null,
        schoolGrade: null,
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

  const popup =
    open && popupPosition && mounted ? (
      <div
        ref={popupRef}
        id={listboxId}
        role="listbox"
        style={{
          position: "fixed",
          top: popupPosition.top,
          left: popupPosition.left,
          width: popupPosition.width,
          zIndex: POPUP_Z_INDEX,
        }}
        className="overflow-hidden rounded-md border bg-popover shadow-lg ring-1 ring-border/60"
      >
        <div className="sticky top-0 z-10 bg-popover">
          <PickerGridHeader />
        </div>
        <div
          className="overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
          style={{ maxHeight: popupPosition.maxHeight }}
        >
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
                <li
                  key={row.mode === "empty" ? "__empty__" : row.option.fighterId}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={isDisabled}
                    title={row.title}
                    className={cn(
                      "w-full px-2 py-1 text-left transition-colors hover:bg-muted/60",
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
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      {name ? (
        <input
          type="hidden"
          name={name}
          value={internalValue}
          required={required}
        />
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
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

      {mounted && popup ? createPortal(popup, document.body) : null}
    </div>
  );
}
