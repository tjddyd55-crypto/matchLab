import { ApprovedApplicationPicker } from "@/components/domain/brackets/ApprovedApplicationPicker";
import { FighterAvatar } from "@/components/shared/FighterAvatar";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { BracketFighterSnapshotPayload } from "@/lib/bracket-snapshot";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import { cn } from "@/lib/utils";

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
  const style = CORNER_SLOT_STYLES[cornerLabel];
  const display = fighterId
    ? resolveFighterDisplay(fighterId, snapshot, options)
    : null;

  return (
    <div className={cn("flex flex-1 flex-col px-3 py-2", style.bg, className)}>
      <span className={cn("text-[11px] font-semibold", style.accent)}>
        {cornerLabel}
      </span>

      {display ? (
        <div className="mt-1 flex gap-2">
          <FighterAvatar
            src={display.profileImageUrl}
            name={display.name}
            className="size-9 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold leading-tight">
              {display.name}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {display.gymName}
            </div>
            <div className="text-muted-foreground truncate text-[11px]">
              {display.divisionLabel}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground mt-1 text-sm">미배정</p>
      )}

      <ApprovedApplicationPicker
        value={fighterId}
        onChange={onChange}
        options={options}
        disabledOptionIds={disabledOptionIds}
        disabled={editDisabled}
        placeholder="선수 변경"
        className="mt-2 max-w-none text-xs"
      />
    </div>
  );
}
