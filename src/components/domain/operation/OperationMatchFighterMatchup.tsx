import { BracketFighterInlineIdentity } from "@/components/domain/brackets/BracketFighterInlineIdentity";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import { cn } from "@/lib/utils";

type OperationFighter = {
  id?: string | null;
  name?: string | null;
  gymName?: string | null;
};

function OperationFighterCell({
  corner,
  fighter,
  isWinner,
  identityMode,
  density,
}: {
  corner: "홍코너" | "청코너";
  fighter?: OperationFighter | null;
  isWinner?: boolean;
  identityMode: "truncate" | "full" | "wrap";
  density: "default" | "compact";
}) {
  const style = CORNER_SLOT_STYLES[corner];
  const empty = !fighter?.name?.trim() || fighter.name === "-";

  const identityClassName = cn(
    "min-w-0 text-xs",
    identityMode === "full" && "whitespace-nowrap",
    identityMode === "wrap" && "line-clamp-2 break-words leading-snug text-center",
    identityMode === "truncate" && "flex-1",
  );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-center rounded-md border px-2 text-center",
        density === "compact" ? "min-h-[52px] py-1" : "min-h-[2.5rem] py-1",
        style.bg,
        isWinner && "ring-2 ring-inset ring-emerald-600/70",
      )}
    >
      {empty ? (
        <BracketFighterInlineIdentity fallbackText="미배정" className="text-xs" />
      ) : (
        <div className="flex min-w-0 max-w-full items-center justify-center gap-1">
          <BracketFighterInlineIdentity
            fighterName={fighter?.name}
            gymName={fighter?.gymName}
            truncate={identityMode === "truncate"}
            className={identityClassName}
          />
          {isWinner ? (
            <span className="bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none whitespace-nowrap">
              승
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** 경기 운영 — 홍 VS 청 구조화 셀 */
export function OperationMatchFighterMatchup({
  fighterRed,
  fighterBlue,
  winnerId,
  className,
  identityMode = "truncate",
  density = "default",
}: {
  fighterRed?: OperationFighter | null;
  fighterBlue?: OperationFighter | null;
  winnerId?: string | null;
  className?: string;
  /** operation: PC 전체 표시 / wrap: 모바일 2줄 허용 / truncate: 기본 */
  identityMode?: "truncate" | "full" | "wrap";
  density?: "default" | "compact";
}) {
  return (
    <div
      className={cn(
        "grid w-full items-stretch",
        density === "compact" ? "gap-1" : "gap-1.5",
        identityMode === "full"
          ? "min-w-[24rem] grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]"
          : "min-w-0 grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)]",
        className,
      )}
    >
      <OperationFighterCell
        corner="홍코너"
        fighter={fighterRed}
        identityMode={identityMode}
        density={density}
        isWinner={Boolean(winnerId && fighterRed?.id && winnerId === fighterRed.id)}
      />
      <div className="flex shrink-0 items-center justify-center self-stretch">
        <span
          className={cn(
            bracketCardTypography.vs,
            density === "compact"
              ? "text-[15px] font-bold leading-none whitespace-nowrap"
              : "text-xs leading-none whitespace-nowrap",
          )}
        >
          VS
        </span>
      </div>
      <OperationFighterCell
        corner="청코너"
        fighter={fighterBlue}
        identityMode={identityMode}
        density={density}
        isWinner={Boolean(winnerId && fighterBlue?.id && winnerId === fighterBlue.id)}
      />
    </div>
  );
}
