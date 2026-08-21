import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { FighterPickerOptionState } from "@/lib/bracket-fighter-picker";
import { formatFighterInlineIdentity } from "@/components/domain/brackets/BracketFighterInlineIdentity";
import {
  nowrapTruncateClass,
  shortenAssignabilityReason,
} from "@/lib/ui/match-grid-layout";
import { organizerBracketFieldSelectClass } from "@/lib/ui/organizer-bracket-ui";
import { cn } from "@/lib/utils";

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
  const selectClass = cn(
    organizerBracketFieldSelectClass,
    "w-full min-w-0 max-w-full text-xs shadow-sm",
    nowrapTruncateClass,
    className,
  );

  const activeFighterId = currentFighterId ?? value;

  function resolveOptionMeta(o: OrganizerApprovedFighterOptionVM) {
    const state = optionStates?.get(o.fighterId);
    const disabledByLegacy = disabledOptionIds?.has(o.fighterId);
    const selectable =
      state?.selectable ??
      (!disabledByLegacy && o.isAssignableForBracket);
    const reason = state?.reason;
    const warningReason = state?.warningReason ?? o.assignabilityWarningReason;
    const hint = state?.statusHint;
    const identity =
      formatFighterInlineIdentity(o.gymName, o.fighterName) || o.label;
    return { selectable, reason, warningReason, hint, identity };
  }

  const currentOption = activeFighterId
    ? options.find((o) => o.fighterId === activeFighterId)
    : undefined;

  const rest = options.filter((o) => o.fighterId !== activeFighterId);
  const available: OrganizerApprovedFighterOptionVM[] = [];
  const assignedElsewhere: OrganizerApprovedFighterOptionVM[] = [];
  const otherDisabled: OrganizerApprovedFighterOptionVM[] = [];

  for (const o of rest) {
    const { selectable, hint } = resolveOptionMeta(o);
    if (hint) {
      assignedElsewhere.push(o);
    } else if (selectable) {
      available.push(o);
    } else {
      otherDisabled.push(o);
    }
  }

  function renderOption(
    o: OrganizerApprovedFighterOptionVM,
    mode: "current" | "normal",
  ) {
    const { selectable, reason, warningReason, hint, identity } =
      resolveOptionMeta(o);
    const labelParts: string[] =
      mode === "current"
        ? [`✓ 현재 선수 · ${identity}`]
        : [identity];
    if (mode === "normal" && hint) labelParts.push(`(${hint})`);
    const shortWarning = shortenAssignabilityReason(warningReason);
    const shortReason = shortenAssignabilityReason(reason);
    if (mode === "normal" && shortWarning && selectable) {
      labelParts.push(`— ${shortWarning}`);
    }
    if (mode === "normal" && !selectable && shortReason) {
      labelParts.push(`— ${shortReason}`);
    }
    const title = !selectable ? reason : warningReason ?? reason;
    const prefix =
      mode === "current"
        ? ""
        : !selectable
          ? "⊘ "
          : warningReason
            ? "⚠ "
            : "";
    return (
      <option
        key={o.fighterId}
        value={o.fighterId}
        disabled={!selectable && o.fighterId !== value}
        title={title ?? undefined}
        className={
          !selectable
            ? "text-muted-foreground"
            : warningReason
              ? "text-amber-900 dark:text-amber-100"
              : undefined
        }
      >
        {prefix}
        {labelParts.join(" ")}
      </option>
    );
  }

  const optionNodes = (
    <>
      {currentOption ? renderOption(currentOption, "current") : null}
      <option value="">{placeholder ?? "빈 슬롯"}</option>
      {available.map((o) => renderOption(o, "normal"))}
      {assignedElsewhere.map((o) => renderOption(o, "normal"))}
      {otherDisabled.map((o) => renderOption(o, "normal"))}
    </>
  );

  if (onChange) {
    return (
      <select
        required={required}
        disabled={disabled}
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {optionNodes}
      </select>
    );
  }

  return (
    <select
      name={name}
      required={required}
      disabled={disabled}
      className={selectClass}
      defaultValue={value}
    >
      {optionNodes}
    </select>
  );
}
