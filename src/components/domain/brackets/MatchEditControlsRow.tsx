"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import { MatchBoutFormatToggle } from "@/components/domain/brackets/MatchBoutFormatToggle";
import { BracketMatchControlsRow } from "@/components/domain/brackets/BracketMatchCompactRow";
import { MatchOperationalSettingsSelect } from "@/components/domain/brackets/MatchOperationalSettingsSelect";
import { MatchOrganizerMemoInput } from "@/components/domain/brackets/MatchOrganizerMemoInput";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import {
  CourtScheduleMatchReorderControls,
  type CourtScheduleReorderMatch,
} from "@/components/domain/courts/CourtScheduleMatchReorderControls";
import { Button } from "@/components/ui/button";
import { matchCourtSaveButtonClass } from "@/lib/ui/match-grid-layout";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type {
  OrganizerBracketMatchVM,
  OrganizerEventAllMatchesDivisionOptionVM,
} from "@/lib/services/bracket.service";
import { BracketType } from "@/lib/enums";

/** 경기장 · 라운드 · 시간 — 하단 compact control row (label 없음) */
export function MatchEditControlsRow({
  eventId,
  bracketId,
  courts,
  match,
  editLocked = false,
  endActions,
  divisionOptions,
  currentDivisionId,
  draftDivisionId,
  onDraftDivisionIdChange,
  matchWeightKg,
  savedMatchWeightKg = null,
  courtScheduleReorder = null,
}: {
  eventId: string;
  bracketId: string;
  courts: EventCourtVM[];
  match: OrganizerBracketMatchVM;
  editLocked?: boolean;
  /** 우측 끝 — 삭제 등 (저장 버튼 옆에 배치) */
  endActions?: ReactNode;
  divisionOptions?: OrganizerEventAllMatchesDivisionOptionVM[];
  currentDivisionId?: string | null;
  draftDivisionId?: string | null;
  onDraftDivisionIdChange?: (divisionId: string) => void;
  /** @deprecated 경기구분 변경 시 선수 유지 — 호환용으로 남겨둠 */
  options?: unknown;
  matchWeightKg?: string;
  /** dirty 기준 — 정식 필드 또는 legacy memo 추출값 */
  savedMatchWeightKg?: number | null;
  /** 대진표 보기와 동일 — court schedule reorder (↑↓·숫자) */
  courtScheduleReorder?: {
    allMatches: CourtScheduleReorderMatch[];
    courtMatches: CourtScheduleReorderMatch[];
  } | null;
}) {
  const [organizerMemo, setOrganizerMemo] = useState(match.organizerMemo ?? "");
  const [saveControls, setSaveControls] = useState<{
    save: () => void;
    pending: boolean;
    disabled: boolean;
  } | null>(null);

  useEffect(() => {
    scheduleEffectStateUpdate(() => {
      setOrganizerMemo(match.organizerMemo ?? "");
    });
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

  const divisionDirty = Boolean(
    draftDivisionId &&
      currentDivisionId &&
      draftDivisionId !== currentDivisionId,
  );

  const extraFormFields = useMemo(() => {
    if (!divisionDirty || !draftDivisionId) return undefined;
    return { targetDivisionId: draftDivisionId };
  }, [divisionDirty, draftDivisionId]);

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
            matchWeightKg={matchWeightKg}
            savedMatchWeightKg={
              savedMatchWeightKg !== undefined
                ? savedMatchWeightKg
                : match.matchWeightKg
            }
            extraFormFields={extraFormFields}
            extraDirty={divisionDirty}
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
          <div className="flex flex-wrap items-center justify-end gap-1">
            {courtScheduleReorder &&
            match.courtId &&
            courtScheduleReorder.courtMatches.length > 1 ? (
              <CourtScheduleMatchReorderControls
                compact
                eventId={eventId}
                matchId={match.id}
                courtId={match.courtId}
                allMatches={courtScheduleReorder.allMatches}
                courtMatches={courtScheduleReorder.courtMatches}
                disabled={editLocked}
              />
            ) : null}
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
      resultMemo={match.resultMemo}
      bracketType={bracketType}
      bracketIsPublic={bracketIsPublic}
      disabled={editLocked}
    />
  );
}
