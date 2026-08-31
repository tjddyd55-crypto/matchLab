"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MatchBoutFormatToggle } from "@/components/domain/brackets/MatchBoutFormatToggle";
import { BracketMatchControlsRow } from "@/components/domain/brackets/BracketMatchCompactRow";
import { MatchOperationalSettingsSelect } from "@/components/domain/brackets/MatchOperationalSettingsSelect";
import { MatchOrganizerMemoInput } from "@/components/domain/brackets/MatchOrganizerMemoInput";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import {
  CourtScheduleMatchReorderControls,
  type CourtScheduleReorderMatch,
} from "@/components/domain/courts/CourtScheduleMatchReorderControls";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { matchCourtSaveButtonClass } from "@/lib/ui/match-grid-layout";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type {
  OrganizerApprovedFighterOptionVM,
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
  options,
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
  options?: OrganizerApprovedFighterOptionVM[];
  matchWeightKg?: string;
  /** dirty 기준 — 정식 필드 또는 legacy memo 추출값 */
  savedMatchWeightKg?: number | null;
  /** 대진표 보기와 동일 — court schedule reorder (↑↓·숫자) */
  courtScheduleReorder?: {
    allMatches: CourtScheduleReorderMatch[];
    courtMatches: CourtScheduleReorderMatch[];
  } | null;
}) {
  const { confirm } = useAppConfirmDialog();
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

  const divisionDirty = Boolean(
    draftDivisionId &&
      currentDivisionId &&
      draftDivisionId !== currentDivisionId,
  );

  const extraFormFields = useMemo(() => {
    if (!divisionDirty || !draftDivisionId) return undefined;
    return { targetDivisionId: draftDivisionId };
  }, [divisionDirty, draftDivisionId]);

  const beforeSave = useCallback(async () => {
    if (!divisionDirty || !draftDivisionId || !options) return true;

    const fighterIds = [match.fighterRedId, match.fighterBlueId].filter(
      (id): id is string => Boolean(id),
    );
    if (fighterIds.length === 0) return true;

    const incompatible = fighterIds.some((fighterId) => {
      const opt = options.find((o) => o.fighterId === fighterId);
      return !opt || opt.divisionId !== draftDivisionId;
    });
    if (!incompatible) return true;

    const ok = await confirm({
      title: "경기구분 변경",
      description:
        "경기구분을 변경하면 현재 배정된 선수 중 새 경기구분과 맞지 않는 선수가 있습니다. 배정을 해제하고 변경하시겠습니까?",
      confirmLabel: "배정 해제 후 변경",
      cancelLabel: "취소",
      variant: "danger",
    });
    if (!ok) return false;
    return {
      extraFields: { clearIncompatibleFighters: "true" },
    };
  }, [
    confirm,
    divisionDirty,
    draftDivisionId,
    match.fighterBlueId,
    match.fighterRedId,
    options,
  ]);

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
            beforeSave={beforeSave}
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
