"use client";

import { OrganizerMatchEditSlot } from "@/components/domain/brackets/OrganizerMatchEditSlot";
import {
  BracketMatchCompactRow,
} from "@/components/domain/brackets/BracketMatchCompactRow";
import { BracketMatchCenterCell } from "@/components/domain/brackets/BracketMatchCenterCell";
import {
  MatchEditCenterBadges,
  MatchEditControlsRow,
} from "@/components/domain/brackets/MatchEditControlsRow";
import { MatchStatusBadge } from "@/components/domain/shared/MatchStatusBadge";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { BracketType } from "@/lib/enums";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import { cn } from "@/lib/utils";

export function OrganizerMatchEditCard({
  eventId,
  bracketId,
  courts,
  match,
  matches,
  options,
  bracketType,
  bracketIsPublic,
}: {
  eventId: string;
  bracketId: string;
  courts: EventCourtVM[];
  match: OrganizerBracketMatchVM;
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
  bracketType: BracketType;
  bracketIsPublic?: boolean;
}) {
  const editLocked = Boolean(match.hasOfficialResults);
  const orderLabel = formatMatchOrderShort(match);

  return (
    <BracketMatchCompactRow
      matchOrderLabel={orderLabel}
      statusArea={
        <div className="flex flex-col items-center gap-0.5">
          <MatchStatusBadge status={match.status} size="sm" />
          {match.hasOfficialResults ? (
            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-medium leading-none whitespace-nowrap">
              결과 확정
            </span>
          ) : null}
        </div>
      }
      redSlot={
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
          hideCornerLabel
          className={cn(
            CORNER_SLOT_STYLES["홍코너"].bg,
            "rounded-md border px-2 py-1.5",
          )}
        />
      }
      center={
        <BracketMatchCenterCell
          badges={
            <MatchEditCenterBadges
              match={match}
              bracketType={bracketType}
              bracketIsPublic={bracketIsPublic}
              editLocked={editLocked}
            />
          }
        />
      }
      blueSlot={
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
          hideCornerLabel
          className={cn(
            CORNER_SLOT_STYLES["청코너"].bg,
            "rounded-md border px-2 py-1.5",
          )}
        />
      }
      controls={
        <MatchEditControlsRow
          eventId={eventId}
          bracketId={bracketId}
          courts={courts}
          match={match}
          editLocked={editLocked}
        />
      }
      footer={
        editLocked ? (
          <p className="text-amber-800 border-t bg-muted/10 px-2 py-1.5 text-[11px] dark:text-amber-200">
            공식 결과가 확정된 경기는 선수·라운드 변경이 제한됩니다.
          </p>
        ) : null
      }
    />
  );
}
