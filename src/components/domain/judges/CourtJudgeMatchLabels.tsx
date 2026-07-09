import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import type { CourtJudgeMatchVM } from "@/lib/services/judge-court.service";
import { cn } from "@/lib/utils";

export function CourtJudgeMatchLabels({
  match,
  className,
  divisionClassName,
  settingsClassName,
  compact = false,
  showDivision = true,
}: {
  match: CourtJudgeMatchVM;
  className?: string;
  divisionClassName?: string;
  settingsClassName?: string;
  compact?: boolean;
  showDivision?: boolean;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {showDivision ? (
        <p
          className={cn(
            compact ? "truncate text-[11px]" : "text-xs",
            "text-muted-foreground",
            divisionClassName,
          )}
        >
          {match.divisionLabel ?? "경기구분 미상"}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <BoutFormatBadge
          bracketType={match.bracketType}
          bracketIsPublic={match.bracketIsPublic}
          matchIsPublicSparring={match.matchIsPublicSparring}
          resultMemo={match.resultMemo}
        />
        <span
          className={cn(
            "text-muted-foreground",
            compact ? "truncate text-[11px]" : "text-xs",
            settingsClassName,
          )}
        >
          {match.operationalSettingsLabel}
        </span>
      </div>
    </div>
  );
}
