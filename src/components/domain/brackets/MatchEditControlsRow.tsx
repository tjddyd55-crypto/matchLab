"use client";

import { MatchBoutFormatToggle } from "@/components/domain/brackets/MatchBoutFormatToggle";
import { BracketMatchControlsRow } from "@/components/domain/brackets/BracketMatchCompactRow";
import { MatchOperationalSettingsSelect } from "@/components/domain/brackets/MatchOperationalSettingsSelect";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import { BracketType } from "@/lib/enums";

/** 경기장 · 라운드 · 시간 — 하단 compact control row (label 없음) */
export function MatchEditControlsRow({
  eventId,
  bracketId,
  courts,
  match,
  editLocked = false,
}: {
  eventId: string;
  bracketId: string;
  courts: EventCourtVM[];
  match: OrganizerBracketMatchVM;
  editLocked?: boolean;
}) {
  return (
    <BracketMatchControlsRow
      left={
        <MatchCourtControls
          eventId={eventId}
          bracketId={bracketId}
          matchId={match.id}
          courts={courts}
          courtId={match.courtId}
          courtOrder={match.courtOrder}
          hasOfficialResults={match.hasOfficialResults}
          inline
          hideCourtOrder
          hideLabels
          compactRow
        />
      }
      center={
        <MatchOperationalSettingsSelect
          matchId={match.id}
          resultMemo={match.resultMemo}
          disabled={editLocked}
          hideLabels
          inline
        />
      }
    />
  );
}

export function MatchEditCenterBadges({
  match,
  bracketType,
  bracketIsPublic,
  editLocked,
}: {
  match: OrganizerBracketMatchVM;
  bracketType: BracketType;
  bracketIsPublic?: boolean;
  editLocked?: boolean;
}) {
  return (
    <MatchBoutFormatToggle
      matchId={match.id}
      bracketType={bracketType}
      bracketIsPublic={bracketIsPublic}
      resultMemo={match.resultMemo}
      disabled={editLocked}
    />
  );
}
