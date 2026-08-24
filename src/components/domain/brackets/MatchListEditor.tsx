"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OrganizerMatchEditCard } from "@/components/domain/brackets/OrganizerMatchEditCard";
import { BracketMatchColumnHeader } from "@/components/domain/brackets/BracketMatchCompactRow";
import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import {
  MatchedMatchFilterToolbar,
} from "@/components/domain/brackets/MatchedMatchFilterToolbar";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { addEmptyBracketMatchAction } from "@/features/brackets/actions";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type {
  OrganizerBracketMatchVM,
  OrganizerEventAllMatchVM,
} from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import {
  DEFAULT_MATCHED_MATCH_FILTERS,
  filterMatchedMatches,
  hasActiveMatchedMatchFilters,
  type MatchedMatchFilterState,
} from "@/lib/brackets/matched-match-filters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BracketType } from "@/lib/enums";
import { sortMatchesByOrder } from "@/lib/match-order-display";
import {
  formatCourtScheduleMatchOrderShort,
  sortMatchesByCourtSchedule,
} from "@/lib/court-match-order";
import {
  bracketWorkspaceControlsClass,
  bracketWorkspaceListScrollClass,
  bracketWorkspacePaneClass,
  bracketWorkspaceScopeRowClass,
  bracketWorkspaceTitleRowClass,
} from "@/lib/ui/bracket-workspace-ui";
import { cn } from "@/lib/utils";

function isEventAllMatch(
  m: OrganizerBracketMatchVM,
): m is OrganizerEventAllMatchVM {
  return "bracketId" in m && typeof (m as OrganizerEventAllMatchVM).bracketId === "string";
}

export function MatchListEditor({
  eventId,
  courts,
  bracketId,
  bracketType,
  bracketIsPublic,
  matches,
  options,
  compactWorkspace = false,
  orderMode = "bracket",
  eventWide = false,
  onRequestAddEmptyMatch,
}: {
  eventId: string;
  courts: EventCourtVM[];
  bracketId: string;
  bracketType: BracketType;
  bracketIsPublic?: boolean;
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
  /** 그룹 상세 2분할 왼쪽 pane */
  compactWorkspace?: boolean;
  /** bracket: 그룹 matchOrder / courtSchedule: 대진표 보기 SSOT */
  orderMode?: "bracket" | "courtSchedule";
  /** 이벤트 전체 모드 — match.bracketId / divisionLabel 사용 */
  eventWide?: boolean;
  /** 제공 시 빈 경기 추가 기본 action 대신 호출 */
  onRequestAddEmptyMatch?: () => void;
}) {
  const router = useRouter();
  const { alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [matchedFilters, setMatchedFilters] = useState<MatchedMatchFilterState>(
    DEFAULT_MATCHED_MATCH_FILTERS,
  );

  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive),
    [courts],
  );

  const sortedMatches = useMemo(() => {
    if (orderMode === "courtSchedule") {
      return sortMatchesByCourtSchedule(
        matches.map((m) => ({ ...m, matchId: m.id })),
        courts.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
      );
    }
    return sortMatchesByOrder(matches);
  }, [courts, matches, orderMode]);

  const filteredMatches = useMemo(
    () => filterMatchedMatches(sortedMatches, options, matchedFilters),
    [matchedFilters, options, sortedMatches],
  );

  const filtersActive = hasActiveMatchedMatchFilters(matchedFilters);
  const defaultCourtId = activeCourts[0]?.id;

  function handleAddEmptyMatch() {
    if (onRequestAddEmptyMatch) {
      onRequestAddEmptyMatch();
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bracketId", bracketId);
      if (defaultCourtId) fd.set("defaultCourtId", defaultCourtId);
      const res = await addEmptyBracketMatchAction(fd);
      if (!res.ok) {
        await alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card
      className={cn(
        compactWorkspace && cn(bracketWorkspacePaneClass, "border-0 shadow-none"),
      )}
    >
      <CardHeader
        className={cn(
          "space-y-2",
          compactWorkspace && bracketWorkspaceControlsClass,
        )}
      >
        <div className={bracketWorkspaceTitleRowClass}>
          <CardTitle className="text-lg">
            대진 잡힌 경기{" "}
            <span className="text-muted-foreground font-normal tabular-nums">
              {filteredMatches.length}경기
            </span>
            {filtersActive && filteredMatches.length !== sortedMatches.length ? (
              <span className="text-muted-foreground ml-1 text-xs font-normal">
                / 전체 {sortedMatches.length}
              </span>
            ) : null}
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={pending || activeCourts.length === 0}
            onClick={handleAddEmptyMatch}
          >
            {pending ? "추가 중…" : "빈 경기 추가"}
          </Button>
        </div>
        {!compactWorkspace ? (
          <CardDescription>
            선수·경기장·라운드·시간 변경은 즉시 저장됩니다. 경기 순서는 대진표
            보기에서 조정하세요.
          </CardDescription>
        ) : (
          <div className={bracketWorkspaceScopeRowClass} aria-hidden />
        )}
        <MatchedMatchFilterToolbar
          matches={sortedMatches}
          options={options}
          filters={matchedFilters}
          onFiltersChange={setMatchedFilters}
          layout={compactWorkspace ? "stack" : "inline"}
        />
      </CardHeader>
      <CardContent
        className={cn(
          "space-y-4",
          compactWorkspace && bracketWorkspaceListScrollClass,
        )}
        data-bracket-workspace-list={compactWorkspace ? "matched" : undefined}
      >
        {activeCourts.length === 0 ? (
          <FeedbackMessage tone="error" role="alert">
            활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
          </FeedbackMessage>
        ) : null}

        {sortedMatches.length === 0 ? (
          <BracketsEmptyState message="등록된 경기가 없습니다. 빈 경기 추가로 경기를 만들거나, 자동매칭을 사용하세요." />
        ) : filteredMatches.length === 0 ? (
          <p className="text-muted-foreground rounded border border-dashed px-3 py-4 text-center text-sm">
            조건에 맞는 대진이 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <BracketMatchColumnHeader />
            {filteredMatches.map((m) => {
              const rowBracketId = isEventAllMatch(m) ? m.bracketId : bracketId;
              const rowBracketType = isEventAllMatch(m)
                ? m.bracketType
                : bracketType;
              const rowBracketIsPublic = isEventAllMatch(m)
                ? m.bracketIsPublic
                : bracketIsPublic;
              const matchOrderLabel =
                orderMode === "courtSchedule"
                  ? formatCourtScheduleMatchOrderShort({
                      matchId: m.id,
                      courtId: m.courtId,
                      courtOrder: m.courtOrder,
                      matchNumber: m.matchNumber,
                      globalMatchOrder: m.globalMatchOrder,
                      matchOrder: m.matchOrder,
                    })
                  : undefined;
              const divisionLabel =
                eventWide && isEventAllMatch(m) ? m.divisionLabel : null;

              return (
                <OrganizerMatchEditCard
                  key={m.id}
                  eventId={eventId}
                  bracketId={rowBracketId}
                  courts={courts}
                  match={m}
                  matches={sortedMatches}
                  options={options}
                  bracketType={rowBracketType}
                  bracketIsPublic={rowBracketIsPublic}
                  matchOrderLabel={matchOrderLabel}
                  divisionLabel={divisionLabel}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
