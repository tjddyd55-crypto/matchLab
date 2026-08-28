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
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { resolveSlotFighterDisplay } from "@/lib/bracket-fighter-compact-display";
import { buildBracketFighterMetaLineFromOption } from "@/lib/brackets/bracket-fighter-meta-line";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import type { BracketFighterSnapshotPayload } from "@/lib/bracket-snapshot";
import {
  buildFighterPickerOptionStates,
  fighterNeedsMoveConfirm,
} from "@/lib/bracket-fighter-picker";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import { isExternalRegistrationPlaceholderGymName } from "@/lib/gym/external-registration-placeholder-gym";
import { cn } from "@/lib/utils";

function resolveFighterDisplay(
  fighterId: string,
  snapshot: BracketFighterSnapshotPayload | null | undefined,
  options: OrganizerApprovedFighterOptionVM[],
) {
  const opt = options.find((o) => o.fighterId === fighterId);
  if (snapshot) {
    const snapGym = snapshot.gymName?.trim() ?? "";
    const preferOptionsGym =
      !snapGym || isExternalRegistrationPlaceholderGymName(snapGym);
    const optionsGym = opt?.gymName?.trim() ?? "";
    const gymName = preferOptionsGym
      ? optionsGym || "소속 미상"
      : snapGym;
    const metaLine = opt
      ? buildBracketFighterMetaLineFromOption(opt)
      : undefined;
    return {
      fighterName: opt?.fighterName?.trim() || snapshot.name,
      gymName,
      statusBadge: undefined as
        | ReturnType<typeof resolveSlotFighterDisplay>["statusBadge"]
        | undefined,
      metaLine,
    };
  }
  if (opt) {
    const resolved = resolveSlotFighterDisplay(opt);
    return {
      ...resolved,
      metaLine:
        buildBracketFighterMetaLineFromOption(opt) ?? resolved.metaLine,
    };
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
  applicationId,
  onEditProfile,
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
  applicationId?: string | null;
  onEditProfile?: (applicationId: string) => void;
}) {
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
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
          await alert(res.error.message);
          return;
        }
        router.refresh();
        return;
      }

      if (fighterNeedsMoveConfirm(matches, nextId, matchId)) {
        const ok = await confirm({
          title: "복수 출전으로 추가할까요?",
          description:
            "이 선수는 다른 경기에 이미 배정되어 있습니다. 기존 배정은 유지하고 이 경기에도 추가합니다.",
        });
        if (!ok) return;
      }

      const fd = new FormData();
      fd.set("bracketId", bracketId);
      fd.set("matchId", matchId);
      fd.set("fighterId", nextId);
      fd.set("slot", slot);
      if (fighterNeedsMoveConfirm(matches, nextId, matchId)) {
        fd.set("allowDuplicateAssignment", "on");
      }
      const res = await assignFighterToMatchAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        await alert(res.error.message);
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
          {applicationId && onEditProfile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 px-2 text-[11px] font-medium"
              disabled={pending}
              onClick={() => onEditProfile(applicationId)}
            >
              선수정보 수정
            </Button>
          ) : null}
          <ApprovedApplicationPicker
            value={fighterId}
            currentFighterId={fighterId}
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
            currentFighterId={fighterId}
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
        <FeedbackMessage tone="error" role="alert" className="mt-1 text-[10px]">
          {error}
        </FeedbackMessage>
      ) : null}
    </div>
  );
}
