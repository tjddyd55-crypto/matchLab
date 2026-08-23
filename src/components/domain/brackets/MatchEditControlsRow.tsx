"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { MatchBoutFormatToggle } from "@/components/domain/brackets/MatchBoutFormatToggle";
import { BracketMatchControlsRow } from "@/components/domain/brackets/BracketMatchCompactRow";
import { MatchOperationalSettingsSelect } from "@/components/domain/brackets/MatchOperationalSettingsSelect";
import { MatchOrganizerMemoInput } from "@/components/domain/brackets/MatchOrganizerMemoInput";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import { Button } from "@/components/ui/button";
import { matchCourtSaveButtonClass } from "@/lib/ui/match-grid-layout";
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
  endActions,
}: {
  eventId: string;
  bracketId: string;
  courts: EventCourtVM[];
  match: OrganizerBracketMatchVM;
  editLocked?: boolean;
  /** 우측 끝 — 삭제 등 (저장 버튼 옆에 배치) */
  endActions?: ReactNode;
}) {
  const [organizerMemo, setOrganizerMemo] = useState(match.organizerMemo ?? "");
  const [saveControls, setSaveControls] = useState<{
    save: () => void;
    pending: boolean;
    disabled: boolean;
  } | null>(null);

  useEffect(() => {
    setOrganizerMemo(match.organizerMemo ?? "");
  }, [match.id, match.organizerMemo]);

  const handleSaveControlsChange = useCallback(
    (controls: {
      save: () => void;
      pending: boolean;
      disabled: boolean;
    }) => {
      setSaveControls(controls);
    },
    [],
  );

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
            hideSaveButton
            onSaveControlsChange={handleSaveControlsChange}
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
        right={
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="sm"
              className={matchCourtSaveButtonClass}
              disabled={!saveControls || saveControls.disabled || editLocked}
              onClick={() => saveControls?.save()}
            >
              {saveControls?.pending ? "저장 중…" : "저장"}
            </Button>
            {endActions}
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
