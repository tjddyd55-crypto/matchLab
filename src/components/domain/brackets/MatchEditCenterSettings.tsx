"use client";

import { MatchBoutFormatToggle } from "@/components/domain/brackets/MatchBoutFormatToggle";
import { MatchOperationalSettingsSelect } from "@/components/domain/brackets/MatchOperationalSettingsSelect";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import { BracketType } from "@/lib/enums";

export function MatchEditCenterSettings({
  eventId,
  bracketId,
  courts,
  match,
  bracketType,
  bracketIsPublic,
  editLocked = false,
}: {
  eventId: string;
  bracketId: string;
  courts: EventCourtVM[];
  match: OrganizerBracketMatchVM;
  bracketType: BracketType;
  bracketIsPublic?: boolean;
  editLocked?: boolean;
}) {
  return (
    <div className="flex w-full min-w-[10rem] flex-col gap-2 px-1 py-2">
      <MatchBoutFormatToggle
        matchId={match.id}
        bracketType={bracketType}
        bracketIsPublic={bracketIsPublic}
        resultMemo={match.resultMemo}
        disabled={editLocked}
      />
      <MatchCourtControls
        eventId={eventId}
        bracketId={bracketId}
        matchId={match.id}
        courts={courts}
        courtId={match.courtId}
        courtOrder={match.courtOrder}
        hasOfficialResults={match.hasOfficialResults}
        immediate
        hideCourtOrder
      />
      <MatchOperationalSettingsSelect
        matchId={match.id}
        resultMemo={match.resultMemo}
        disabled={editLocked}
      />
    </div>
  );
}
