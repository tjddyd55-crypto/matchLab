import { ApprovedApplicationPicker } from "@/components/domain/brackets/ApprovedApplicationPicker";
import { FighterAvatar } from "@/components/shared/FighterAvatar";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { BracketFighterSnapshotPayload } from "@/lib/bracket-snapshot";
import { cn } from "@/lib/utils";

const CORNER_STYLES: Record<
  string,
  { border: string; bg: string; accent: string }
> = {
  홍코너: {
    border: "border-red-500/50",
    bg: "bg-red-500/5",
    accent: "text-red-700 dark:text-red-300",
  },
  청코너: {
    border: "border-blue-500/50",
    bg: "bg-blue-500/5",
    accent: "text-blue-700 dark:text-blue-300",
  },
};

function resolveFighterDisplay(
  fighterId: string,
  snapshot: BracketFighterSnapshotPayload | null | undefined,
  options: OrganizerApprovedFighterOptionVM[],
): {
  name: string;
  gymName: string;
  divisionLabel: string;
  profileImageUrl: string | null;
} {
  if (snapshot) {
    return {
      name: snapshot.name,
      gymName: snapshot.gymName ?? "소속 미상",
      divisionLabel: snapshot.divisionName ?? "—",
      profileImageUrl: snapshot.profileImageUrl,
    };
  }
  const opt = options.find((o) => o.fighterId === fighterId);
  if (opt) {
    const [name, gym] = opt.label.split(" · ");
    return {
      name: name ?? opt.label,
      gymName: gym ?? "소속 미상",
      divisionLabel: opt.divisionLabel,
      profileImageUrl: null,
    };
  }
  return {
    name: "미배정",
    gymName: "—",
    divisionLabel: "—",
    profileImageUrl: null,
  };
}

export function OrganizerMatchEditSlot({
  cornerLabel,
  fighterId,
  snapshot,
  options,
  disabledOptionIds,
  onChange,
  editDisabled,
  className,
}: {
  cornerLabel: "홍코너" | "청코너";
  fighterId: string;
  snapshot?: BracketFighterSnapshotPayload | null;
  options: OrganizerApprovedFighterOptionVM[];
  disabledOptionIds?: ReadonlySet<string>;
  onChange: (fighterId: string) => void;
  editDisabled?: boolean;
  className?: string;
}) {
  const style = CORNER_STYLES[cornerLabel];
  const display = fighterId
    ? resolveFighterDisplay(fighterId, snapshot, options)
    : null;

  return (
    <div
      className={cn(
        "flex min-h-[8rem] flex-1 flex-col rounded-xl border px-4 py-3",
        style.border,
        style.bg,
        className,
      )}
    >
      <span className={cn("text-xs font-semibold tracking-wide", style.accent)}>
        {cornerLabel}
      </span>

      {display ? (
        <div className="mt-2 flex gap-3">
          <FighterAvatar
            src={display.profileImageUrl}
            name={display.name}
            className="size-11 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="truncate text-lg font-bold leading-tight">
              {display.name}
            </div>
            <div className="text-muted-foreground truncate text-sm">
              소속 체육관 · {display.gymName}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {display.divisionLabel}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm font-medium">미배정</p>
      )}

      <label className="mt-3 space-y-1">
        <span className="text-muted-foreground text-[11px] font-medium">
          선수 변경
        </span>
        <ApprovedApplicationPicker
          value={fighterId}
          onChange={onChange}
          options={options}
          disabledOptionIds={disabledOptionIds}
          disabled={editDisabled}
          placeholder={`${cornerLabel} 선수`}
          className="max-w-none"
        />
      </label>
    </div>
  );
}
