"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignFighterToMatchAction,
  removeFighterFromMatchAction,
} from "@/features/brackets/actions";
import { ApprovedApplicationPicker } from "@/components/domain/brackets/ApprovedApplicationPicker";
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
): { name: string; gymName: string; statusLabel?: string } {
  if (snapshot) {
    return {
      name: snapshot.name,
      gymName: snapshot.gymName ?? "소속 미상",
    };
  }
  const opt = options.find((o) => o.fighterId === fighterId);
  if (opt) {
    const [name] = opt.label.split(" · ");
    return {
      name: name ?? opt.label,
      gymName: opt.label.split(" · ")[1] ?? "소속 미상",
      statusLabel: opt.isEligibleForBracket
        ? undefined
        : opt.eligibilityLabel,
    };
  }
  return { name: "선수 미정", gymName: "—" };
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

  return (
    <div className={cn("flex flex-1 flex-col px-3 py-2", style.bg, className)}>
      <span className={cn("text-[11px] font-semibold", style.accent)}>
        {cornerLabel}
      </span>

      {display ? (
        <div className="mt-1 min-w-0 space-y-0.5">
          <div className="truncate text-base font-bold leading-tight md:text-lg">
            {display.name}
          </div>
          <div className="text-muted-foreground truncate text-xs md:text-sm">
            {display.gymName}
          </div>
          {display.statusLabel ? (
            <div className="text-amber-800 truncate text-[11px] dark:text-amber-200">
              {display.statusLabel}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground mt-1 text-sm">선수 미정</p>
      )}

      <ApprovedApplicationPicker
        value={fighterId}
        onChange={handleChange}
        options={options}
        optionStates={optionStates}
        disabled={editDisabled || pending}
        placeholder="빈 슬롯"
        className="mt-2 max-w-none text-xs"
      />
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
