import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { FighterPickerOptionState } from "@/lib/bracket-fighter-picker";
import { formatFighterInlineIdentity } from "@/components/domain/brackets/BracketFighterInlineIdentity";
import {
  nowrapTruncateClass,
  shortenAssignabilityReason,
} from "@/lib/ui/match-grid-layout";
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
}) {
  const selectClass = cn(
    "border-input bg-background h-8 w-full min-w-0 max-w-full rounded-md border px-2 text-xs shadow-sm",
    nowrapTruncateClass,
    className,
  );

  const optionNodes = (
    <>
      <option value="">{placeholder ?? "빈 슬롯"}</option>
      {options.map((o) => {
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
        const labelParts = [identity];
        if (hint) labelParts.push(`(${hint})`);
        const shortWarning = shortenAssignabilityReason(warningReason);
        const shortReason = shortenAssignabilityReason(reason);
        if (shortWarning && selectable) {
          labelParts.push(`— ${shortWarning}`);
        }
        if (!selectable && shortReason) labelParts.push(`— ${shortReason}`);
        const title = !selectable ? reason : warningReason ?? reason;
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
            {!selectable ? "⊘ " : warningReason ? "⚠ " : ""}
            {labelParts.join(" ")}
          </option>
        );
      })}
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
