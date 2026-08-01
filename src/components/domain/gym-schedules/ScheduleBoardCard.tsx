"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import {
  ScheduleBoardCardMenu,
  type ScheduleBoardMenuAction,
} from "@/components/domain/gym-schedules/ScheduleBoardCardMenu";
import {
  buildRangeFromMinutes,
  durationLabel,
  minutesFromDate,
  pointerYToSnappedMinutes,
  snapMinutes,
} from "@/lib/gym-schedule/board-geometry";
import { gymStaffColorClass } from "@/lib/gym-schedule/labels";
import {
  SCHEDULE_PX_PER_MINUTE,
  scheduleBlockHeightPx,
  scheduleBlockTopPx,
} from "@/lib/gym-schedule/seoul-schedule";
import type { GymCalendarItem } from "@/lib/gym-schedule/calendar-item";
import { cn } from "@/lib/utils";

export type BoardTimePatch = {
  dateKey: string;
  startHm: string;
  endHm: string;
  startsAt: Date;
  endsAt: Date;
};

type DragMode = "move" | "resize-start" | "resize-end";

function canInteract(item: GymCalendarItem): boolean {
  return item.canManage && item.status === "scheduled";
}

function elevatedCardClass(colorKey: string | null | undefined, selected: boolean) {
  return cn(
    "group absolute z-10 overflow-hidden rounded-lg border border-white/70 bg-white/95 text-left shadow-md ring-1 transition",
    "hover:z-20 hover:shadow-lg hover:ring-matchon-primary/30",
    selected && "z-20 ring-2 ring-matchon-primary shadow-lg",
    gymStaffColorClass(colorKey),
  );
}

export function ScheduleBoardCard({
  item,
  dateKey,
  compact,
  selected,
  preview,
  onSelect,
  onRequestEdit,
  onRequestReschedule,
  menuActions,
  insetClassName = "inset-x-1",
  minHeightPx = 28,
}: {
  item: GymCalendarItem;
  dateKey: string;
  compact?: boolean;
  selected?: boolean;
  preview?: BoardTimePatch | null;
  onSelect: (item: GymCalendarItem) => void;
  onRequestEdit: (item: GymCalendarItem) => void;
  onRequestReschedule: (
    item: GymCalendarItem,
    patch: BoardTimePatch,
  ) => Promise<boolean>;
  menuActions: ScheduleBoardMenuAction[];
  insetClassName?: string;
  minHeightPx?: number;
}) {
  const interactive = canInteract(item);
  const displayStarts = preview?.startsAt ?? item.startsAt;
  const displayEnds = preview?.endsAt ?? item.endsAt;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [localPreview, setLocalPreview] = useState<BoardTimePatch | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    mode: DragMode;
    originY: number;
    originStartMin: number;
    originEndMin: number;
    durationMin: number;
    targetDateKey: string;
    columnEl: HTMLElement | null;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const shown = localPreview ?? preview;
  const starts = shown?.startsAt ?? displayStarts;
  const ends = shown?.endsAt ?? displayEnds;
  const top = scheduleBlockTopPx(starts);
  const height = Math.max(minHeightPx, scheduleBlockHeightPx(starts, ends));

  const resolveColumn = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const col = el?.closest("[data-schedule-day]") as HTMLElement | null;
    return col;
  }, []);

  function openMenu(x: number, y: number) {
    setMenuAnchor({ x, y });
    setMenuOpen(true);
  }

  function beginDrag(
    e: ReactPointerEvent,
    mode: DragMode,
  ) {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    const columnEl = (e.currentTarget as HTMLElement).closest(
      "[data-schedule-day]",
    ) as HTMLElement | null;
    const startMin = minutesFromDate(item.startsAt);
    const endMin = minutesFromDate(item.endsAt);
    dragRef.current = {
      mode,
      originY: e.clientY,
      originStartMin: startMin,
      originEndMin: endMin,
      durationMin: endMin - startMin,
      targetDateKey: dateKey,
      columnEl,
    };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const col =
      resolveColumn(e.clientX, e.clientY) ?? drag.columnEl;
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const targetDate =
      col.getAttribute("data-schedule-day") || drag.targetDateKey;
    drag.targetDateKey = targetDate;
    drag.columnEl = col;

    const absoluteMin = pointerYToSnappedMinutes(e.clientY, rect.top);
    const deltaMin = snapMinutes(
      (e.clientY - drag.originY) / SCHEDULE_PX_PER_MINUTE,
    );

    let next;
    if (drag.mode === "move") {
      next = buildRangeFromMinutes(
        targetDate,
        drag.originStartMin + deltaMin,
        drag.originStartMin + deltaMin + drag.durationMin,
      );
    } else if (drag.mode === "resize-start") {
      next = buildRangeFromMinutes(
        drag.targetDateKey,
        absoluteMin,
        drag.originEndMin,
      );
    } else {
      next = buildRangeFromMinutes(
        drag.targetDateKey,
        drag.originStartMin,
        absoluteMin,
      );
    }
    setLocalPreview(next);
  }

  async function onPointerUp(e: ReactPointerEvent) {
    const drag = dragRef.current;
    const patch = localPreview;
    dragRef.current = null;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!drag || !patch) {
      setLocalPreview(null);
      return;
    }
    const unchanged =
      patch.dateKey === item.dateKey &&
      patch.startsAt.getTime() === item.startsAt.getTime() &&
      patch.endsAt.getTime() === item.endsAt.getTime();
    if (unchanged) {
      setLocalPreview(null);
      return;
    }
    suppressClickRef.current = true;
    const ok = await onRequestReschedule(item, patch);
    if (!ok) setLocalPreview(null);
    // on success parent refresh clears preview via remount/props
    else setLocalPreview(null);
  }

  const titlePrimary =
    item.itemType === "group_class" ? item.title : item.memberName;
  const secondary =
    item.itemType === "group_class"
      ? `${item.staffName || "미정"}${
          item.capacity != null
            ? ` · ${item.participantCount ?? 0}/${item.capacity}`
            : ""
        }${item.waitlistCount ? ` · 대기 ${item.waitlistCount}` : ""} · ${item.statusLabel}`
      : `${item.scheduleTypeLabel} · ${item.staffName} · ${item.statusLabel}`;

  return (
    <>
      <div
        data-testid="schedule-block"
        data-schedule-id={item.id}
        className={cn(
          elevatedCardClass(item.colorKey, Boolean(selected || dragging)),
          insetClassName,
          item.itemType === "group_class" && "border-l-[3px] border-l-matchon-primary",
          item.status === "cancelled" && "opacity-50",
          interactive && "cursor-grab active:cursor-grabbing",
          dragging && "opacity-90",
        )}
        style={{ top, height }}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onSelect(item);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openMenu(e.clientX, e.clientY);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
          setDragging(false);
          setLocalPreview(null);
        }}
      >
        {interactive ? (
          <button
            type="button"
            aria-label="시작 시간 조절"
            data-testid="schedule-resize-start"
            className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize opacity-0 transition group-hover:opacity-100"
            onPointerDown={(e) => beginDrag(e, "resize-start")}
          />
        ) : null}

        <div
          className={cn("flex h-full gap-1.5 px-1.5 py-1", compact && "py-0.5")}
          onPointerDown={(e) => {
            if (!interactive) return;
            if ((e.target as HTMLElement).closest("[data-menu-trigger]")) return;
            beginDrag(e, "move");
          }}
        >
          {!compact && item.itemType === "personal" ? (
            <GymMemberAvatar
              name={item.memberName || ""}
              src={item.memberProfileImageUrl}
              className="mt-0.5 size-7 shrink-0"
            />
          ) : !compact && item.itemType === "group_class" ? (
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-matchon-primary/15 text-[9px] font-semibold text-matchon-primary">
              그룹
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="text-[11px] font-semibold tabular-nums leading-tight">
                {shown?.startHm
                  ? `${shown.startHm}–${shown.endHm}`
                  : item.timeRangeLabel}
              </p>
              <button
                type="button"
                data-menu-trigger
                aria-label="더보기"
                className="rounded p-0.5 text-matchon-text-secondary opacity-70 hover:bg-black/5 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  openMenu(r.right, r.bottom);
                }}
              >
                ⋯
              </button>
            </div>
            <p className="truncate text-[11px] font-medium leading-tight">
              {titlePrimary}
            </p>
            {!compact ? (
              <p className="truncate text-[10px] leading-tight opacity-80">
                {secondary}
              </p>
            ) : null}
            {shown && height >= 56 ? (
              <p className="text-[10px] tabular-nums opacity-70">
                {durationLabel(starts, ends)}
              </p>
            ) : null}
          </div>
        </div>

        {interactive ? (
          <button
            type="button"
            aria-label="종료 시간 조절"
            data-testid="schedule-resize-end"
            className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize opacity-0 transition group-hover:opacity-100"
            onPointerDown={(e) => beginDrag(e, "resize-end")}
          />
        ) : null}
      </div>

      <ScheduleBoardCardMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        anchor={menuAnchor}
        actions={
          menuActions.length
            ? menuActions
            : [
                {
                  id: "edit",
                  label: "일정 수정",
                  onSelect: () => onRequestEdit(item),
                },
              ]
        }
      />
    </>
  );
}
