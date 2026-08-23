"use client";

import { useEffect, useState } from "react";
import { MatchBoutFormatToggle } from "@/components/domain/brackets/MatchBoutFormatToggle";
import { BracketMatchControlsRow } from "@/components/domain/brackets/BracketMatchCompactRow";
import { MatchOperationalSettingsSelect } from "@/components/domain/brackets/MatchOperationalSettingsSelect";
import { MatchOrganizerMemoInput } from "@/components/domain/brackets/MatchOrganizerMemoInput";
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
  const [organizerMemo, setOrganizerMemo] = useState(match.organizerMemo ?? "");

  useEffect(() => {
    setOrganizerMemo(match.organizerMemo ?? "");
  }, [match.id, match.organizerMemo]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
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
            organizerMemo={organizerMemo}
            savedOrganizerMemo={match.organizerMemo}
          />
        }
        center={
          <div className="bg-muted/50 inline-flex items-center rounded-md px-1 py-0.5">
            <MatchOperationalSettingsSelect
              matchId={match.id}
              resultMemo={match.resultMemo}
              disabled={editLocked}
              hideLabels
              inline
            />
          </div>
        }
      />
      <MatchOrganizerMemoInput
        value={organizerMemo}
        onChange={setOrganizerMemo}
        disabled={editLocked}
      />
    </div>
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
