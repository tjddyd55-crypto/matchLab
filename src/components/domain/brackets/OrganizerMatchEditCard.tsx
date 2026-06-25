"use client";

import { useState } from "react";
import { OrganizerMatchEditSlot } from "@/components/domain/brackets/OrganizerMatchEditSlot";
import { MatchEditCenterSettings } from "@/components/domain/brackets/MatchEditCenterSettings";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { MatchStatusBadge } from "@/components/domain/shared/MatchStatusBadge";
import { MatchDivisionHeader } from "@/components/domain/shared/MatchDivisionHeader";
import { Button } from "@/components/ui/button";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { BracketType } from "@/lib/enums";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { cornerSlotInGridClass } from "@/lib/corner-slot-styles";

function matchListOpsProps(
  m: OrganizerBracketMatchVM,
  bracketType: BracketType,
) {
  return {
    bracketType,
    matchId: m.id,
    status: m.status,
    fighterRedId: m.fighterRedId,
    fighterBlueId: m.fighterBlueId,
    fighterRedName: m.fighterRedSnapshot?.name ?? "미배정",
    fighterBlueName: m.fighterBlueSnapshot?.name ?? "미배정",
    hasOfficialResults: m.hasOfficialResults,
    winnerId: m.winnerId,
    resultType: m.resultType,
    resultMemo: m.resultMemo,
    compact: true as const,
  };
}

export function OrganizerMatchEditCard({
  eventId,
  bracketId,
  courts,
  match,
  matches,
  options,
  bracketType,
  bracketIsPublic,
  division,
  compactDivision = true,
}: {
  eventId: string;
  bracketId: string;
  courts: EventCourtVM[];
  match: OrganizerBracketMatchVM;
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
  bracketType: BracketType;
  bracketIsPublic?: boolean;
  division?: EventDivisionDisplayInput | null;
  compactDivision?: boolean;
}) {
  const [opsOpen, setOpsOpen] = useState(false);
  const editLocked = Boolean(match.hasOfficialResults);
  const orderLabel = formatMatchOrderFormal(match);

  return (
    <article className="ring-foreground/10 overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5">
        <MatchDivisionHeader
          matchNumberLabel={orderLabel}
          division={division}
          compact={compactDivision}
          showSportRule={false}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <MatchStatusBadge status={match.status} size="md" />
          {match.hasOfficialResults ? (
            <span className="text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              결과 확정
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-0 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <OrganizerMatchEditSlot
          bracketId={bracketId}
          matchId={match.id}
          cornerLabel="홍코너"
          slot="red"
          fighterId={match.fighterRedId ?? ""}
          snapshot={match.fighterRedSnapshot}
          options={options}
          matches={matches}
          editDisabled={editLocked}
          className={cornerSlotInGridClass("홍코너", "border-b md:border-b-0")}
        />

        <div className="bg-muted/30 text-muted-foreground flex flex-col items-center justify-center border-b px-2 md:border-b-0">
          <span className={bracketCardTypography.vs}>VS</span>
          <MatchEditCenterSettings
            eventId={eventId}
            bracketId={bracketId}
            courts={courts}
            match={match}
            bracketType={bracketType}
            bracketIsPublic={bracketIsPublic}
            editLocked={editLocked}
          />
        </div>

        <OrganizerMatchEditSlot
          bracketId={bracketId}
          matchId={match.id}
          cornerLabel="청코너"
          slot="blue"
          fighterId={match.fighterBlueId ?? ""}
          snapshot={match.fighterBlueSnapshot}
          options={options}
          matches={matches}
          editDisabled={editLocked}
          className={cornerSlotInGridClass("청코너")}
        />
      </div>

      <footer className="border-t bg-muted/10 px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setOpsOpen((v) => !v)}
        >
          {opsOpen ? "경기 운영 닫기" : "경기 운영 열기"}
        </Button>
        {opsOpen ? (
          <div className="pt-2">
            <OrganizerMatchOpsPanel
              {...matchListOpsProps(match, bracketType)}
            />
          </div>
        ) : null}
        {editLocked ? (
          <p className="text-amber-800 mt-2 text-[11px] dark:text-amber-200">
            공식 결과가 확정된 경기는 선수·라운드 변경이 제한됩니다.
          </p>
        ) : null}
      </footer>
    </article>
  );
}
