"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createManualMatchWithPairAction } from "@/features/brackets/actions";
import {
  buildManualMatchConfirmDescription,
  buildManualPairWarnings,
  fightersRequiringDivisionMove,
  type ManualMatchPairSide,
} from "@/lib/brackets/manual-match-pair";
import {
  buildFighterAssignmentMap,
  formatAssignmentSummaryCompact,
  getFighterAssignments,
} from "@/lib/bracket-fighter-assignment";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import { cn } from "@/lib/utils";

export const UNMATCHED_DND_MIME = "application/x-matchon-unmatched-fighter";

export type ManualMatchSlotAthlete = Pick<
  OrganizerApprovedFighterOptionVM,
  | "fighterId"
  | "applicationId"
  | "fighterName"
  | "gymName"
  | "label"
  | "recordSummary"
  | "applicationWeightKg"
>;

type SlotKey = "red" | "blue";

export type ManualMatchPickSlot = SlotKey;

function athleteMetaLine(a: ManualMatchSlotAthlete): string {
  const parts: string[] = [];
  if (a.recordSummary) parts.push(a.recordSummary.replace(/\s+/g, ""));
  if (a.applicationWeightKg != null) {
    parts.push(`신청체중 ${a.applicationWeightKg}kg`);
  }
  return parts.join(" · ");
}

export function setUnmatchedDragPayload(
  e: DragEvent,
  fighterId: string,
): void {
  e.dataTransfer.setData(UNMATCHED_DND_MIME, fighterId);
  e.dataTransfer.setData("text/plain", fighterId);
  e.dataTransfer.effectAllowed = "move";
}

function DropSlot({
  corner,
  athlete,
  dragOver,
  activePick,
  onDragOver,
  onDragLeave,
  onDrop,
  onClear,
  onTapSelect,
  onActivatePick,
}: {
  corner: "홍코너" | "청코너";
  athlete: ManualMatchSlotAthlete | null;
  dragOver: boolean;
  activePick: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onClear: () => void;
  onTapSelect: () => void;
  onActivatePick: () => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[88px] flex-col justify-center rounded-lg border border-dashed px-3 py-2 transition-colors",
        dragOver || activePick
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : athlete
            ? "border-primary/40 bg-primary/5"
            : "border-matchon-border bg-muted/20",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-tight">{corner}</p>
        <div className="flex items-center gap-1">
          {!athlete ? (
            <Button
              type="button"
              variant={activePick ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-1.5 text-xs"
              onClick={onActivatePick}
            >
              {activePick ? "선택 중" : "클릭 배정"}
            </Button>
          ) : null}
          {athlete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs"
              onClick={onClear}
            >
              제거
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs md:hidden"
              onClick={onTapSelect}
            >
              목록
            </Button>
          )}
        </div>
      </div>
      {athlete ? (
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium">
            {athlete.gymName} · {athlete.fighterName}
          </p>
          {athleteMetaLine(athlete) ? (
            <p className="text-muted-foreground truncate text-[11px]">
              {athleteMetaLine(athlete)}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          className="text-muted-foreground text-left text-xs"
          onClick={onTapSelect}
        >
          선수를 끌어놓으세요
          <span className="mt-0.5 block md:hidden">또는 탭하여 선택</span>
        </button>
      )}
    </div>
  );
}

function toPairSide(
  option: OrganizerApprovedFighterOptionVM,
  assignmentMap: ReturnType<typeof buildFighterAssignmentMap>,
): ManualMatchPairSide {
  const assignments = getFighterAssignments(assignmentMap, option.fighterId);
  return {
    fighterId: option.fighterId,
    fighterName: option.fighterName,
    gymName: option.gymName,
    divisionId: option.divisionId,
    currentDivisionLabel: option.currentDivisionLabel,
    applicationWeightKg: option.applicationWeightKg,
    recordSummary: option.recordSummary,
    fighterGender: option.fighterGender,
    assignmentCount: assignments.length,
    assignmentSummary:
      assignments.length > 0
        ? formatAssignmentSummaryCompact(assignments)
        : undefined,
  };
}

export function athleteFromManualMatchOption(
  option: OrganizerApprovedFighterOptionVM,
): ManualMatchSlotAthlete {
  return {
    fighterId: option.fighterId,
    applicationId: option.applicationId,
    fighterName: option.fighterName,
    gymName: option.gymName,
    label: option.label,
    recordSummary: option.recordSummary,
    applicationWeightKg: option.applicationWeightKg,
  };
}

export function formatManualMatchSelectionHint(
  red: ManualMatchSlotAthlete | null,
  blue: ManualMatchSlotAthlete | null,
): string | null {
  if (red && blue) return "홍/청 선택됨";
  if (red) return "홍 선택됨";
  if (blue) return "청 선택됨";
  return null;
}

export function ManualMatchCreatePanel({
  bracketId,
  defaultCourtId,
  unmatched,
  matches = [],
  allowDuplicateAssignment = false,
  targetDivisionId,
  targetDivisionLabel,
  targetDivisionGender,
  red,
  blue,
  onRedChange,
  onBlueChange,
  pending,
  setPendingExternal,
  activePickSlot,
  onActivePickSlotChange,
  dockExpanded,
  onDockExpandedChange,
  sticky = true,
  resolveManualMatchTarget,
}: {
  bracketId: string;
  defaultCourtId?: string;
  unmatched: OrganizerApprovedFighterOptionVM[];
  /** event/bracket matches — 복수 출전 경고용 */
  matches?: OrganizerBracketMatchVM[];
  /** 복수 경기 모드 ON일 때만 true */
  allowDuplicateAssignment?: boolean;
  targetDivisionId: string | null;
  targetDivisionLabel: string | null;
  targetDivisionGender?: string | null;
  red: ManualMatchSlotAthlete | null;
  blue: ManualMatchSlotAthlete | null;
  onRedChange: (v: ManualMatchSlotAthlete | null) => void;
  onBlueChange: (v: ManualMatchSlotAthlete | null) => void;
  pending: boolean;
  setPendingExternal: (v: boolean) => void;
  activePickSlot: ManualMatchPickSlot | null;
  onActivePickSlotChange: (slot: ManualMatchPickSlot | null) => void;
  dockExpanded: boolean;
  onDockExpandedChange: (expanded: boolean) => void;
  sticky?: boolean;
  /** 전체 경기 편집 — 생성 전 bracket/division 해석 */
  resolveManualMatchTarget?: (
    red: OrganizerApprovedFighterOptionVM,
    blue: OrganizerApprovedFighterOptionVM,
  ) => Promise<{
    bracketId: string;
    targetDivisionId: string;
    targetDivisionLabel: string;
    targetDivisionGender: string | null;
  } | null>;
}) {
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
  const [, startTransition] = useTransition();
  const [dragOverSlot, setDragOverSlot] = useState<SlotKey | null>(null);
  const [pickerSlot, setPickerSlot] = useState<SlotKey | null>(null);
  const [dockHeight, setDockHeight] = useState(48);
  const confirmPairKeyRef = useRef<string | null>(null);
  const dockRef = useRef<HTMLElement>(null);
  const titleId = useId();

  const byId = useMemo(() => {
    const map = new Map<string, OrganizerApprovedFighterOptionVM>();
    for (const o of unmatched) map.set(o.fighterId, o);
    return map;
  }, [unmatched]);

  const assignmentMap = useMemo(
    () => buildFighterAssignmentMap(matches),
    [matches],
  );

  useEffect(() => {
    if (!sticky || !dockExpanded || !dockRef.current) return;
    const node = dockRef.current;
    const update = () => setDockHeight(node.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [sticky, dockExpanded, red, blue, pending]);

  const placeAthlete = useCallback(
    (slot: SlotKey, fighterId: string) => {
      const option = byId.get(fighterId);
      if (!option) {
        void alert({
          title: "배정 불가",
          description: "선수 배정 상태가 변경되었습니다.",
        });
        return;
      }
      const athlete: ManualMatchSlotAthlete = {
        fighterId: option.fighterId,
        applicationId: option.applicationId,
        fighterName: option.fighterName,
        gymName: option.gymName,
        label: option.label,
        recordSummary: option.recordSummary,
        applicationWeightKg: option.applicationWeightKg,
      };
      if (slot === "red") {
        if (blue?.fighterId === fighterId) {
          void alert({
            title: "중복 배정",
            description: "동일 선수를 홍·청 코너에 동시에 둘 수 없습니다.",
          });
          return;
        }
        onRedChange(athlete);
      } else {
        if (red?.fighterId === fighterId) {
          void alert({
            title: "중복 배정",
            description: "동일 선수를 홍·청 코너에 동시에 둘 수 없습니다.",
          });
          return;
        }
        onBlueChange(athlete);
      }
      onActivePickSlotChange(null);
      onDockExpandedChange(true);
    },
    [
      alert,
      blue?.fighterId,
      byId,
      onActivePickSlotChange,
      onBlueChange,
      onDockExpandedChange,
      onRedChange,
      red?.fighterId,
    ],
  );

  const runCreateConfirm = useCallback(async () => {
    if (!red || !blue || pending) return;
    const pairKey = `${red.fighterId}:${blue.fighterId}`;
    if (confirmPairKeyRef.current === pairKey) return;
    confirmPairKeyRef.current = pairKey;

    const redOption = byId.get(red.fighterId);
    const blueOption = byId.get(blue.fighterId);
    if (!redOption || !blueOption) {
      confirmPairKeyRef.current = null;
      await alert({
        title: "배정 불가",
        description: "선수 배정 상태가 변경되었습니다.",
      });
      return;
    }

    let activeBracketId = bracketId;
    let activeDivisionId = targetDivisionId;
    let activeDivisionLabel = targetDivisionLabel;
    let activeDivisionGender = targetDivisionGender ?? null;

    if (resolveManualMatchTarget) {
      const resolved = await resolveManualMatchTarget(redOption, blueOption);
      if (!resolved) {
        confirmPairKeyRef.current = null;
        return;
      }
      activeBracketId = resolved.bracketId;
      activeDivisionId = resolved.targetDivisionId;
      activeDivisionLabel = resolved.targetDivisionLabel;
      activeDivisionGender = resolved.targetDivisionGender;
    }

    const redSide = toPairSide(redOption, assignmentMap);
    const blueSide = toPairSide(blueOption, assignmentMap);
    const warnings = buildManualPairWarnings({
      red: redSide,
      blue: blueSide,
      targetDivisionId: activeDivisionId,
      targetDivisionLabel: activeDivisionLabel,
      targetDivisionGender: activeDivisionGender,
    });
    const moveIds = fightersRequiringDivisionMove(
      redSide,
      blueSide,
      activeDivisionId,
    );
    const isCrossDivision = moveIds.length > 0;
    const hasDuplicate =
      (redSide.assignmentCount ?? 0) > 0 || (blueSide.assignmentCount ?? 0) > 0;

    const description = buildManualMatchConfirmDescription({
      red: redSide,
      blue: blueSide,
      targetDivisionLabel: activeDivisionLabel ?? "현재 그룹",
      moveFighters: isCrossDivision
        ? [redSide, blueSide].filter((side) =>
            moveIds.some((m) => m.fighterId === side.fighterId),
          )
        : [],
      warnings,
    });

    const ok = await confirm({
      title: hasDuplicate
        ? "이미 배정된 선수를 추가로 배정할까요?"
        : isCrossDivision
          ? "다른 경기구분 선수와 매칭할까요?"
          : "경기를 생성할까요?",
      description,
      confirmLabel: hasDuplicate
        ? "추가 배정하여 경기 생성"
        : isCrossDivision
          ? "교차 편성하여 경기 생성"
          : "경기 생성",
      cancelLabel: "취소",
    });

    if (!ok) {
      // 슬롯 유지. 동일 pair로 confirm 재오픈 방지 (슬롯 변경/제거 시 ref 초기화)
      return;
    }

    setPendingExternal(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bracketId", activeBracketId);
      fd.set("redFighterId", red.fighterId);
      fd.set("blueFighterId", blue.fighterId);
      if (defaultCourtId) fd.set("defaultCourtId", defaultCourtId);
      if (allowDuplicateAssignment) {
        fd.set("allowDuplicateAssignment", "1");
      }
      const res = await createManualMatchWithPairAction(fd);
      setPendingExternal(false);
      if (!res.ok) {
        confirmPairKeyRef.current = null;
        await alert({
          title: "경기를 생성하지 못했습니다.",
          description:
            res.error.message || "선수 배정 상태를 다시 확인해주세요.",
        });
        return;
      }
      onRedChange(null);
      onBlueChange(null);
      confirmPairKeyRef.current = null;
      router.refresh();
    });
  }, [
    alert,
    allowDuplicateAssignment,
    assignmentMap,
    blue,
    bracketId,
    confirm,
    defaultCourtId,
    onBlueChange,
    onRedChange,
    pending,
    red,
    resolveManualMatchTarget,
    router,
    setPendingExternal,
    targetDivisionGender,
    targetDivisionId,
    targetDivisionLabel,
    byId,
  ]);

  function handleAllowDrop(e: DragEvent, slot: SlotKey) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSlot(slot);
  }

  function handleDrop(e: DragEvent, slot: SlotKey) {
    e.preventDefault();
    setDragOverSlot(null);
    const fighterId =
      e.dataTransfer.getData(UNMATCHED_DND_MIME) ||
      e.dataTransfer.getData("text/plain");
    if (!fighterId) return;
    placeAthlete(slot, fighterId);
  }

  function resetSlots() {
    confirmPairKeyRef.current = null;
    onRedChange(null);
    onBlueChange(null);
    onActivePickSlotChange(null);
  }

  const canCreate = Boolean(red && blue && !pending);

  const showFixedDock = sticky && dockExpanded;

  const dockBody = (
    <div className="max-h-[32vh] space-y-2 overflow-y-auto overflow-x-hidden pr-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 id={titleId} className="text-sm font-semibold">
            수동 경기 만들기
          </h4>
          <p className="text-muted-foreground text-xs">
            드래그하거나 슬롯을 선택한 뒤 선수를 클릭해 배정하세요.
          </p>
        </div>
        {sticky ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => onDockExpandedChange(false)}
          >
            접기
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DropSlot
          corner="홍코너"
          athlete={red}
          dragOver={dragOverSlot === "red"}
          activePick={activePickSlot === "red"}
          onDragOver={(e) => handleAllowDrop(e, "red")}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={(e) => handleDrop(e, "red")}
          onClear={() => {
            confirmPairKeyRef.current = null;
            onRedChange(null);
          }}
          onTapSelect={() => setPickerSlot("red")}
          onActivatePick={() =>
            onActivePickSlotChange(activePickSlot === "red" ? null : "red")
          }
        />
        <DropSlot
          corner="청코너"
          athlete={blue}
          dragOver={dragOverSlot === "blue"}
          activePick={activePickSlot === "blue"}
          onDragOver={(e) => handleAllowDrop(e, "blue")}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={(e) => handleDrop(e, "blue")}
          onClear={() => {
            confirmPairKeyRef.current = null;
            onBlueChange(null);
          }}
          onTapSelect={() => setPickerSlot("blue")}
          onActivatePick={() =>
            onActivePickSlotChange(activePickSlot === "blue" ? null : "blue")
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || (!red && !blue)}
          onClick={resetSlots}
        >
          초기화
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canCreate}
          onClick={() => void runCreateConfirm()}
        >
          경기 생성
        </Button>
      </div>

      {pending ? (
        <p className="text-muted-foreground text-center text-xs">생성 중…</p>
      ) : null}
    </div>
  );

  if (unmatched.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-3 text-center">
        <p className="text-muted-foreground text-xs">
          현재 미배정 선수가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <>
      {showFixedDock ? (
        <section
          ref={dockRef}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          )}
          aria-labelledby={titleId}
        >
          <div className="mx-auto max-w-6xl">{dockBody}</div>
        </section>
      ) : !sticky ? (
        <section className="space-y-2 border-t pt-3" aria-labelledby={titleId}>
          {dockBody}
        </section>
      ) : null}

      {showFixedDock ? (
        <div
          className="shrink-0"
          style={{ height: dockHeight + 8 }}
          aria-hidden
        />
      ) : null}

      <Dialog
        open={pickerSlot != null}
        onOpenChange={(open) => {
          if (!open) setPickerSlot(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pickerSlot === "red" ? "홍코너" : "청코너"} 선수 선택
            </DialogTitle>
            <DialogDescription>
              {allowDuplicateAssignment
                ? "미매칭 선수와 이미 배정된 선수(전체 선수)를 선택할 수 있습니다."
                : "미매칭 선수 중에서 선택하세요."}
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {unmatched
              .filter((o) => {
                if (pickerSlot === "red") return o.fighterId !== blue?.fighterId;
                return o.fighterId !== red?.fighterId;
              })
              .map((o) => {
                const assignmentStatus = formatAssignmentSummaryCompact(
                  getFighterAssignments(assignmentMap, o.fighterId),
                );
                return (
                  <li key={o.applicationId}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start px-2 py-2 text-left"
                      onClick={() => {
                        if (pickerSlot) placeAthlete(pickerSlot, o.fighterId);
                        setPickerSlot(null);
                      }}
                    >
                      <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {o.gymName} · {o.fighterName}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {athleteMetaLine(o)}
                          </span>
                        </span>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {assignmentStatus}
                        </span>
                      </span>
                    </Button>
                  </li>
                );
              })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useManualMatchPlaceAthlete(input: {
  byId: Map<string, OrganizerApprovedFighterOptionVM>;
  red: ManualMatchSlotAthlete | null;
  blue: ManualMatchSlotAthlete | null;
  onRedChange: (v: ManualMatchSlotAthlete | null) => void;
  onBlueChange: (v: ManualMatchSlotAthlete | null) => void;
  onActivePickSlotChange: (slot: ManualMatchPickSlot | null) => void;
  onDockExpand?: () => void;
  alert: (opts: { title: string; description?: string }) => Promise<void>;
}) {
  return useCallback(
    (slot: ManualMatchPickSlot, fighterId: string) => {
      const option = input.byId.get(fighterId);
      if (!option) {
        void input.alert({
          title: "배정 불가",
          description: "선수 배정 상태가 변경되었습니다.",
        });
        return;
      }
      const athlete = athleteFromManualMatchOption(option);
      if (slot === "red") {
        if (input.blue?.fighterId === fighterId) {
          void input.alert({
            title: "중복 배정",
            description: "동일 선수를 홍·청 코너에 동시에 둘 수 없습니다.",
          });
          return;
        }
        input.onRedChange(athlete);
      } else {
        if (input.red?.fighterId === fighterId) {
          void input.alert({
            title: "중복 배정",
            description: "동일 선수를 홍·청 코너에 동시에 둘 수 없습니다.",
          });
          return;
        }
        input.onBlueChange(athlete);
      }
      input.onActivePickSlotChange(null);
      input.onDockExpand?.();
    },
    [input],
  );
}

export function UnmatchedDraggableCardShell({
  fighterId,
  inSlot,
  onDragStart,
  children,
}: {
  fighterId: string;
  inSlot: boolean;
  onDragStart?: () => void;
  children: ReactNode;
}) {
  return (
    <li
      draggable={!inSlot}
      onDragStart={(e) => {
        if (inSlot) {
          e.preventDefault();
          return;
        }
        setUnmatchedDragPayload(e, fighterId);
        onDragStart?.();
      }}
      className={cn(
        "rounded-lg border bg-muted/20 px-2 py-1.5",
        inSlot
          ? "cursor-default opacity-50"
          : "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="text-muted-foreground select-none pt-0.5 text-xs"
          aria-hidden
        >
          ⋮⋮
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  );
}
