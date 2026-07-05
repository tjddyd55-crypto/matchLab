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
}: {
  corner: "홍코너" | "청코너";
  fighter?: OperationFighter | null;
  isWinner?: boolean;
}) {
  const style = CORNER_SLOT_STYLES[corner];
  const empty = !fighter?.name?.trim() || fighter.name === "-";

  return (
    <div
      className={cn(
        "min-w-0 rounded-md border px-2 py-1.5",
        style.bg,
        isWinner && "ring-2 ring-inset ring-emerald-600/70",
      )}
    >
      {empty ? (
        <BracketFighterInlineIdentity fallbackText="미배정" />
      ) : (
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-1">
            <BracketFighterInlineIdentity
              fighterName={fighter?.name}
              gymName={fighter?.gymName}
              className="min-w-0 flex-1 text-xs"
            />
            {isWinner ? (
              <span className="bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                승
              </span>
            ) : null}
          </div>
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
}: {
  fighterRed?: OperationFighter | null;
  fighterBlue?: OperationFighter | null;
  winnerId?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-[14rem] grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] items-stretch gap-1",
        className,
      )}
    >
      <OperationFighterCell
        corner="홍코너"
        fighter={fighterRed}
        isWinner={Boolean(winnerId && fighterRed?.id && winnerId === fighterRed.id)}
      />
      <div className="flex items-center justify-center">
        <span className={cn(bracketCardTypography.vs, "text-xs leading-none")}>
          VS
        </span>
      </div>
      <OperationFighterCell
        corner="청코너"
        fighter={fighterBlue}
        isWinner={Boolean(winnerId && fighterBlue?.id && winnerId === fighterBlue.id)}
      />
    </div>
  );
}
