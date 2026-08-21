"use client";

import { useTransition } from "react";
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
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { BracketType, BracketMatchStatus } from "@/lib/enums";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
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
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const editLocked = Boolean(match.hasOfficialResults);
  const orderLabel = formatMatchOrderShort(match);
  const canDelete =
    bracketType === BracketType.match_list && !match.hasOfficialResults;

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

  return (
    <BracketMatchCompactRow
      matchOrderLabel={orderLabel}
      statusArea={
        <div className="flex flex-col items-center gap-1">
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
          options={options}
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
          options={options}
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
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <MatchEditControlsRow
              eventId={eventId}
              bracketId={bracketId}
              courts={courts}
              match={match}
              editLocked={editLocked}
            />
          </div>
          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? "삭제 중…" : "삭제"}
            </Button>
          ) : null}
        </div>
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
