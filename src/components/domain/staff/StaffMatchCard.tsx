"use client";

import { StaffMatchStatusBadges } from "@/components/domain/staff/StaffMatchStatusBadges";
import { Button } from "@/components/ui/button";
import { BracketMatchStatus } from "@/lib/enums";
import type { StaffEventMatchListItemVM } from "@/lib/staff-match-display";
import {
  matchonBlueCornerPanelClass,
  matchonRedCornerPanelClass,
  matchonVsCardClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export function StaffMatchCard({
  match,
  onOpenEntry,
  onOpenEdit,
  onOpenView,
}: {
  match: StaffEventMatchListItemVM;
  onOpenEntry: () => void;
  onOpenEdit: () => void;
  onOpenView: () => void;
}) {
  const cancelled = match.status === BracketMatchStatus.cancelled;
  const hasOfficial = match.hasOfficialResults;
  const hasDraft =
    !hasOfficial &&
    (match.resultDisplayStatus === "draft" ||
      Boolean(match.winnerId || match.resultType || match.resultMemo));
  const canInput =
    !cancelled &&
    !hasOfficial &&
    Boolean(match.fighterRed?.id && match.fighterBlue?.id);

  return (
    <article className={cn(matchonVsCardClass, "space-y-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-matchon-text-secondary">경기 {match.orderLabel}</p>
          <p className="font-semibold text-matchon-text-primary">
            {match.divisionLabel ?? "경기구분 미상"}
          </p>
        </div>
        <StaffMatchStatusBadges match={match} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={matchonRedCornerPanelClass}>
          <p className="text-xs font-bold uppercase text-red-600">RED</p>
          <p className="line-clamp-2 font-semibold">{match.fighterRed?.name ?? "—"}</p>
          <p className="line-clamp-1 text-xs opacity-80">
            {match.fighterRed?.gymName ?? "—"}
          </p>
        </div>
        <div className={matchonBlueCornerPanelClass}>
          <p className="text-xs font-bold uppercase text-blue-600">BLUE</p>
          <p className="line-clamp-2 font-semibold">{match.fighterBlue?.name ?? "—"}</p>
          <p className="line-clamp-1 text-xs opacity-80">
            {match.fighterBlue?.gymName ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {canInput && !hasDraft ? (
          <Button type="button" size="lg" className="h-12 flex-1" onClick={onOpenEntry}>
            결과 입력
          </Button>
        ) : null}
        {canInput && hasDraft ? (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-12 flex-1"
            onClick={onOpenEdit}
          >
            결과 수정
          </Button>
        ) : null}
        {hasOfficial ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12 flex-1"
            onClick={onOpenView}
          >
            결과 확인
          </Button>
        ) : null}
        {cancelled ? (
          <p className="text-muted-foreground text-sm">취소된 경기입니다.</p>
        ) : null}
      </div>
    </article>
  );
}
