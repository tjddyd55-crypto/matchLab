"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OrganizerMatchEditSlot } from "@/components/domain/brackets/OrganizerMatchEditSlot";
import {
  BracketMatchCompactRow,
} from "@/components/domain/brackets/BracketMatchCompactRow";
import { BracketMatchCenterCell } from "@/components/domain/brackets/BracketMatchCenterCell";
import {
  MatchEditCenterBadges,
  MatchEditControlsRow,
} from "@/components/domain/brackets/MatchEditControlsRow";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteBracketMatchAction } from "@/features/brackets/actions";
import type {
  OrganizerApprovedFighterOptionVM,
  OrganizerBracketMatchVM,
  OrganizerEventAllMatchesDivisionOptionVM,
  OrganizerEventAllMatchVM,
} from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { BracketType, BracketMatchStatus } from "@/lib/enums";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import { MatchWeightKgInput } from "@/components/domain/brackets/MatchWeightKgInput";
import { formatMatchWeightKgInputValue } from "@/lib/brackets/extract-match-weight-from-memo";
import { matchDivisionSelectClass } from "@/lib/ui/match-grid-layout";
import { cn } from "@/lib/utils";

function isEventAllMatch(
  m: OrganizerBracketMatchVM,
): m is OrganizerEventAllMatchVM {
  return (
    "divisionId" in m &&
    typeof (m as OrganizerEventAllMatchVM).divisionId !== "undefined"
  );
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
  matchOrderLabel: matchOrderLabelProp,
  divisionLabel,
  divisionOptions,
}: {
  eventId: string;
  bracketId: string;
  courts: EventCourtVM[];
  match: OrganizerBracketMatchVM;
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
  bracketType: BracketType;
  bracketIsPublic?: boolean;
  /** 제공 시 formatMatchOrderShort 대신 사용 (court schedule SSOT) */
  matchOrderLabel?: string;
  /** 전체 경기 편집 — 카드 상단 경기구분 */
  divisionLabel?: string | null;
  /** event-wide 모드: 경기구분 select SSOT */
  divisionOptions?: OrganizerEventAllMatchesDivisionOptionVM[];
}) {
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const editLocked = Boolean(match.hasOfficialResults);
  const orderLabel = matchOrderLabelProp ?? formatMatchOrderShort(match);
  const canDelete =
    bracketType === BracketType.match_list && !match.hasOfficialResults;

  const currentDivisionId = isEventAllMatch(match)
    ? match.divisionId
    : null;
  const [draftDivisionId, setDraftDivisionId] = useState(
    currentDivisionId ?? "",
  );
  const [draftWeightKg, setDraftWeightKg] = useState(
    formatMatchWeightKgInputValue(match.matchWeightKg),
  );

  useEffect(() => {
    setDraftDivisionId(currentDivisionId ?? "");
  }, [match.id, currentDivisionId]);

  useEffect(() => {
    setDraftWeightKg(formatMatchWeightKgInputValue(match.matchWeightKg));
  }, [match.id, match.matchWeightKg]);

  const slotOptions = useMemo(() => {
    const divisionId = draftDivisionId || currentDivisionId;
    if (!divisionId) return options;
    return options.filter(
      (o) =>
        o.divisionId === divisionId ||
        o.fighterId === match.fighterRedId ||
        o.fighterId === match.fighterBlueId,
    );
  }, [
    currentDivisionId,
    draftDivisionId,
    match.fighterBlueId,
    match.fighterRedId,
    options,
  ]);

  async function handleDelete() {
    if (pending) return;

    const ok = await confirm({
      title: "이 경기를 삭제할까요?",
      description: "경기에서 빠진 선수는 미매칭 선수로 돌아갑니다.",
      confirmLabel: "삭제",
      cancelLabel: "취소",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("bracketId", bracketId);
      fd.set("matchId", match.id);
      const res = await deleteBracketMatchAction(fd);
      if (!res.ok) {
        await alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  const showDivisionSelect =
    Boolean(divisionOptions?.length) && Boolean(currentDivisionId);

  return (
    <BracketMatchCompactRow
      matchOrderLabel={orderLabel}
      leadingExtra={
        <MatchWeightKgInput
          value={draftWeightKg}
          onChange={setDraftWeightKg}
          disabled={editLocked || pending}
        />
      }
      statusArea={
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          {showDivisionSelect ? (
            <select
              className={matchDivisionSelectClass}
              value={draftDivisionId}
              disabled={editLocked || pending}
              title={
                divisionOptions?.find((d) => d.id === draftDivisionId)?.label ??
                divisionLabel ??
                undefined
              }
              aria-label="경기구분"
              onChange={(e) => setDraftDivisionId(e.target.value)}
            >
              {divisionOptions!.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          ) : divisionLabel ? (
            <span
              className="text-muted-foreground max-w-[10rem] truncate text-sm font-semibold leading-tight"
              title={divisionLabel}
            >
              {divisionLabel}
            </span>
          ) : null}
          <MatchonStatusBadge
            status={resolveBracketMatchMatchonStatus(match.status as BracketMatchStatus)}
            label={getBracketMatchMatchonLabel(match.status as BracketMatchStatus)}
            size="sm"
          />
          {match.hasOfficialResults ? (
            <MatchonStatusBadge
              status="application_completed"
              label="결과 확정"
              size="sm"
            />
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
          options={slotOptions}
          matches={matches}
          editDisabled={editLocked}
          hideCornerLabel
          className={cn(
            CORNER_SLOT_STYLES["홍코너"].bg,
            "rounded-md border px-2 py-1.5",
            match.winnerId &&
              match.fighterRedId &&
              match.winnerId === match.fighterRedId &&
              "ring-2 ring-emerald-600/60",
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
          options={slotOptions}
          matches={matches}
          editDisabled={editLocked}
          hideCornerLabel
          className={cn(
            CORNER_SLOT_STYLES["청코너"].bg,
            "rounded-md border px-2 py-1.5",
            match.winnerId &&
              match.fighterBlueId &&
              match.winnerId === match.fighterBlueId &&
              "ring-2 ring-emerald-600/60",
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
          options={options}
          currentDivisionId={currentDivisionId}
          draftDivisionId={draftDivisionId || null}
          onDraftDivisionIdChange={setDraftDivisionId}
          divisionOptions={divisionOptions}
          matchWeightKg={draftWeightKg}
          savedMatchWeightKg={match.matchWeightKg}
          endActions={
            canDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-9"
                disabled={pending}
                onClick={handleDelete}
              >
                {pending ? "삭제 중…" : "삭제"}
              </Button>
            ) : null
          }
        />
      }
      footer={
        editLocked ? (
          <FeedbackMessage tone="warning" className="m-2 text-[11px]">
            공식 결과가 확정된 경기는 선수·라운드 변경이 제한됩니다.
          </FeedbackMessage>
        ) : null
      }
    />
  );
}
