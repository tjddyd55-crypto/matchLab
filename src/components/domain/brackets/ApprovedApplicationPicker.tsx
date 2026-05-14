import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import { cn } from "@/lib/utils";

export function ApprovedApplicationPicker({
  name,
  value,
  onChange,
  options,
  disabledOptionIds,
  placeholder,
  required,
  className,
}: {
  /** 비제어 폼 제출용 — `onChange` 가 없을 때만 전달한다. */
  name?: string;
  value: string;
  onChange?: (fighterId: string) => void;
  options: OrganizerApprovedFighterOptionVM[];
  disabledOptionIds?: ReadonlySet<string>;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const selectClass = cn(
    "border-input bg-background h-9 w-full max-w-xs rounded-md border px-2 text-sm shadow-sm",
    className,
  );

  const optionNodes = (
    <>
      <option value="">{placeholder ?? "선수 선택"}</option>
      {options.map((o) => (
        <option
          key={o.fighterId}
          value={o.fighterId}
          disabled={disabledOptionIds?.has(o.fighterId)}
        >
          {o.label} ({o.divisionLabel})
        </option>
      ))}
    </>
  );

  if (onChange) {
    return (
      <select
        required={required}
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
      className={selectClass}
      defaultValue={value}
    >
      {optionNodes}
    </select>
  );
}
