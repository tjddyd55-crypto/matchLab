"use client";

import { StaffMatchStatusBadges } from "@/components/domain/staff/StaffMatchStatusBadges";
import { Button } from "@/components/ui/button";
import { BracketMatchStatus } from "@/lib/enums";
import type { StaffEventMatchListItemVM } from "@/lib/staff-match-display";

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
    <article className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">경기 {match.orderLabel}</p>
          <p className="font-semibold">{match.divisionLabel ?? "경기구분 미상"}</p>
        </div>
        <StaffMatchStatusBadges match={match} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border px-3 py-3">
          <p className="text-muted-foreground text-xs">선수 A</p>
          <p className="line-clamp-2 font-medium">{match.fighterRed?.name ?? "—"}</p>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {match.fighterRed?.gymName ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border px-3 py-3">
          <p className="text-muted-foreground text-xs">선수 B</p>
          <p className="line-clamp-2 font-medium">{match.fighterBlue?.name ?? "—"}</p>
          <p className="text-muted-foreground line-clamp-1 text-xs">
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
