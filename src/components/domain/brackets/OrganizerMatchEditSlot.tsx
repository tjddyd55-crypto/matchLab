"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignFighterToMatchAction,
  removeFighterFromMatchAction,
} from "@/features/brackets/actions";
import { ApprovedApplicationPicker } from "@/components/domain/brackets/ApprovedApplicationPicker";
import {
  BracketFighterCompactBadge,
  BracketFighterCompactCard,
} from "@/components/domain/brackets/BracketFighterCompactCard";
import { resolveSlotFighterDisplay } from "@/lib/bracket-fighter-compact-display";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import type { BracketFighterSnapshotPayload } from "@/lib/bracket-snapshot";
import {
  buildFighterPickerOptionStates,
  fighterNeedsMoveConfirm,
} from "@/lib/bracket-fighter-picker";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import { cn } from "@/lib/utils";

function resolveFighterDisplay(
  fighterId: string,
  snapshot: BracketFighterSnapshotPayload | null | undefined,
  options: OrganizerApprovedFighterOptionVM[],
) {
  if (snapshot) {
    return {
      fighterName: snapshot.name,
      gymName: snapshot.gymName ?? "소속 미상",
      statusBadge: undefined as
        | ReturnType<typeof resolveSlotFighterDisplay>["statusBadge"]
        | undefined,
      metaLine: undefined as string | undefined,
    };
  }
  const opt = options.find((o) => o.fighterId === fighterId);
  if (opt) {
    return resolveSlotFighterDisplay(opt);
  }
  return null;
}

export function OrganizerMatchEditSlot({
  bracketId,
  matchId,
  cornerLabel,
  slot,
  fighterId,
  snapshot,
  options,
  matches,
  editDisabled,
  hideCornerLabel = false,
  className,
}: {
  bracketId: string;
  matchId: string;
  cornerLabel: "홍코너" | "청코너";
  slot: "red" | "blue";
  fighterId: string;
  snapshot?: BracketFighterSnapshotPayload | null;
  options: OrganizerApprovedFighterOptionVM[];
  matches: OrganizerBracketMatchVM[];
  editDisabled?: boolean;
  hideCornerLabel?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const style = CORNER_SLOT_STYLES[cornerLabel];
  const display = fighterId
    ? resolveFighterDisplay(fighterId, snapshot, options)
    : null;

  const optionStates = buildFighterPickerOptionStates({
    options,
    matches,
    matchId,
    slot,
    currentFighterId: fighterId,
  });

  function handleChange(nextId: string) {
    if (editDisabled || pending) return;
    setError(null);

    startTransition(async () => {
      if (!nextId) {
        const fd = new FormData();
        fd.set("bracketId", bracketId);
        fd.set("matchId", matchId);
        fd.set("slot", slot);
        const res = await removeFighterFromMatchAction(fd);
        if (!res.ok) {
          setError(res.error.message);
          window.alert(res.error.message);
          return;
        }
        router.refresh();
        return;
      }

      if (
        fighterNeedsMoveConfirm(matches, nextId, matchId) &&
        !window.confirm(
          "이 선수는 다른 경기에 배정되어 있습니다. 이동하면 기존 슬롯은 비워집니다. 계속할까요?",
        )
      ) {
        return;
      }

      const fd = new FormData();
      fd.set("bracketId", bracketId);
      fd.set("matchId", matchId);
      fd.set("fighterId", nextId);
      fd.set("slot", slot);
      if (fighterNeedsMoveConfirm(matches, nextId, matchId)) {
        fd.set("moveFromOtherMatch", "on");
      }
      const res = await assignFighterToMatchAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  const statusBadges =
    display?.statusBadge &&
    display.statusBadge.label !== "대진 가능" ? (
      <BracketFighterCompactBadge
        label={display.statusBadge.label}
        variant={display.statusBadge.variant}
        title={display.statusBadge.title}
      />
    ) : null;

  return (
    <div className={cn("flex w-full min-w-0 flex-col", className)}>
      {hideCornerLabel ? null : (
        <span className={cn("text-[11px] font-semibold leading-none", style.accent)}>
          {cornerLabel}
        </span>
      )}

      {display ? (
        <BracketFighterCompactCard
          centerIdentity={hideCornerLabel}
          className={hideCornerLabel ? undefined : "mt-1"}
          fighterName={display.fighterName}
          gymName={display.gymName}
          metaLine={display.metaLine}
          statusBadges={statusBadges}
        >
          <ApprovedApplicationPicker
            value={fighterId}
            onChange={handleChange}
            options={options}
            optionStates={optionStates}
            disabled={editDisabled || pending}
            placeholder="빈 슬롯"
            className="mt-1 h-8 w-full min-w-0 max-w-none text-xs"
          />
        </BracketFighterCompactCard>
      ) : (
        <BracketFighterCompactCard
          centerIdentity={hideCornerLabel}
          className={hideCornerLabel ? undefined : "mt-1"}
          empty
          emptyLabel="선수 미정"
        >
          <ApprovedApplicationPicker
            value={fighterId}
            onChange={handleChange}
            options={options}
            optionStates={optionStates}
            disabled={editDisabled || pending}
            placeholder="빈 슬롯"
            className="mt-1 h-8 w-full min-w-0 max-w-none text-xs"
          />
        </BracketFighterCompactCard>
      )}

      {pending ? (
        <p className="text-muted-foreground mt-1 text-[10px]">저장 중…</p>
      ) : null}
      {error ? (
        <p className="text-destructive mt-1 text-[10px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
