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
import { normalizeGymName } from "@/lib/brackets/gym-match-key";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
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
  onDragOver,
  onDragLeave,
  onDrop,
  onClear,
  onTapSelect,
}: {
  corner: "홍코너" | "청코너";
  athlete: ManualMatchSlotAthlete | null;
  dragOver: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onClear: () => void;
  onTapSelect: () => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[88px] flex-col justify-center rounded-lg border border-dashed px-3 py-2 transition-colors",
        dragOver
          ? "border-primary bg-primary/10"
          : athlete
            ? "border-primary/40 bg-primary/5"
            : "border-matchon-border bg-muted/20",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-tight">{corner}</p>
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
            선택
          </Button>
        )}
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

export function ManualMatchCreatePanel({
  bracketId,
  defaultCourtId,
  unmatched,
  red,
  blue,
  onRedChange,
  onBlueChange,
  pending,
  setPendingExternal,
}: {
  bracketId: string;
  defaultCourtId?: string;
  unmatched: OrganizerApprovedFighterOptionVM[];
  red: ManualMatchSlotAthlete | null;
  blue: ManualMatchSlotAthlete | null;
  onRedChange: (v: ManualMatchSlotAthlete | null) => void;
  onBlueChange: (v: ManualMatchSlotAthlete | null) => void;
  pending: boolean;
  setPendingExternal: (v: boolean) => void;
}) {
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
  const [, startTransition] = useTransition();
  const [dragOverSlot, setDragOverSlot] = useState<SlotKey | null>(null);
  const [pickerSlot, setPickerSlot] = useState<SlotKey | null>(null);
  const confirmPairKeyRef = useRef<string | null>(null);
  const titleId = useId();

  const byId = useMemo(() => {
    const map = new Map<string, OrganizerApprovedFighterOptionVM>();
    for (const o of unmatched) map.set(o.fighterId, o);
    return map;
  }, [unmatched]);

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
    },
    [alert, blue?.fighterId, byId, onBlueChange, onRedChange, red?.fighterId],
  );

  const runCreateConfirm = useCallback(async () => {
    if (!red || !blue || pending) return;
    const pairKey = `${red.fighterId}:${blue.fighterId}`;
    if (confirmPairKeyRef.current === pairKey) return;
    confirmPairKeyRef.current = pairKey;

    const warnings: string[] = [];
    if (
      normalizeGymName(red.gymName) &&
      normalizeGymName(red.gymName) === normalizeGymName(blue.gymName)
    ) {
      warnings.push("같은 체육관 선수입니다.");
    }

    const description = [
      `홍코너\n${red.gymName} · ${red.fighterName}`,
      "",
      `청코너\n${blue.gymName} · ${blue.fighterName}`,
      "",
      "두 선수로 새 경기를 생성합니다.",
      ...(warnings.length ? ["", ...warnings.map((w) => `⚠ ${w}`)] : []),
    ].join("\n");

    const ok = await confirm({
      title: "경기를 생성할까요?",
      description,
      confirmLabel: "경기 생성",
      cancelLabel: "취소",
    });

    if (!ok) {
      // 슬롯 유지. 동일 pair로 confirm 재오픈 방지 (슬롯 변경/제거 시 ref 초기화)
      return;
    }

    setPendingExternal(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bracketId", bracketId);
      fd.set("redFighterId", red.fighterId);
      fd.set("blueFighterId", blue.fighterId);
      if (defaultCourtId) fd.set("defaultCourtId", defaultCourtId);
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
    blue,
    bracketId,
    confirm,
    defaultCourtId,
    onBlueChange,
    onRedChange,
    pending,
    red,
    router,
    setPendingExternal,
  ]);

  useEffect(() => {
    if (red && blue && !pending) {
      void runCreateConfirm();
    }
  }, [red, blue, pending, runCreateConfirm]);

  function allowDrop(e: DragEvent, slot: SlotKey) {
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
    <section className="space-y-2 border-t pt-3" aria-labelledby={titleId}>
      <div>
        <h4 id={titleId} className="text-sm font-semibold">
          수동 경기 만들기
        </h4>
        <p className="text-muted-foreground text-xs">
          미매칭 선수를 좌우 슬롯에 끌어놓아 경기를 추가할 수 있습니다.
        </p>
        {unmatched.length === 1 ? (
          <p className="text-muted-foreground mt-1 text-xs">
            상대 선수가 없습니다. 한 명만으로는 경기를 만들 수 없습니다.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DropSlot
          corner="홍코너"
          athlete={red}
          dragOver={dragOverSlot === "red"}
          onDragOver={(e) => allowDrop(e, "red")}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={(e) => handleDrop(e, "red")}
          onClear={() => {
            confirmPairKeyRef.current = null;
            onRedChange(null);
          }}
          onTapSelect={() => setPickerSlot("red")}
        />
        <DropSlot
          corner="청코너"
          athlete={blue}
          dragOver={dragOverSlot === "blue"}
          onDragOver={(e) => allowDrop(e, "blue")}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={(e) => handleDrop(e, "blue")}
          onClear={() => {
            confirmPairKeyRef.current = null;
            onBlueChange(null);
          }}
          onTapSelect={() => setPickerSlot("blue")}
        />
      </div>

      {pending ? (
        <p className="text-muted-foreground text-center text-xs">생성 중…</p>
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
              미매칭 선수 중에서 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {unmatched
              .filter((o) => {
                if (pickerSlot === "red") return o.fighterId !== blue?.fighterId;
                return o.fighterId !== red?.fighterId;
              })
              .map((o) => (
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
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {o.gymName} · {o.fighterName}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {athleteMetaLine(o)}
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function UnmatchedDraggableCardShell({
  fighterId,
  inSlot,
  children,
}: {
  fighterId: string;
  inSlot: boolean;
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
