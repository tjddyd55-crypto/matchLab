"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import {
  ScheduleBoardCardMenu,
  type ScheduleBoardMenuAction,
} from "@/components/domain/gym-schedules/ScheduleBoardCardMenu";
import {
  createBoardAutoScroll,
  type BoardAutoScroll,
} from "@/lib/gym-schedule/board-auto-scroll";
import {
  buildRangeFromMinutes,
  durationLabel,
  minutesFromDate,
  pointerYToSnappedMinutes,
  snapMinutes,
  type BoardTimePatch,
} from "@/lib/gym-schedule/board-geometry";
import {
  SCHEDULE_BOARD_LAYER,
  SCHEDULE_DAY_COLUMN_SELECTOR,
  SCHEDULE_SCROLL_CONTAINER_SELECTOR,
} from "@/lib/gym-schedule/board-layout";
import { gymStaffColorClass } from "@/lib/gym-schedule/labels";
import {
  SCHEDULE_PX_PER_MINUTE,
  scheduleBlockHeightPx,
  scheduleBlockTopPx,
} from "@/lib/gym-schedule/seoul-schedule";
import type { GymCalendarItem } from "@/lib/gym-schedule/calendar-item";
import { cn } from "@/lib/utils";

export type { BoardTimePatch };

type DragMode = "move" | "resize-start" | "resize-end";

const DRAG_THRESHOLD_PX = 5;

function canInteract(item: GymCalendarItem): boolean {
  return item.canManage && item.status === "scheduled";
}

/**
 * 터치는 스크롤이 최우선이므로 드래그를 열지 않는다.
 * 모바일에서는 카드 탭 → 상세/수정 모달 정책을 그대로 유지한다.
 */
function isDragCapablePointer(pointerType: string): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}

function elevatedCardClass(colorKey: string | null | undefined, selected: boolean) {
  return cn(
    "group absolute overflow-hidden rounded-lg border border-white/70 bg-white/95 text-left shadow-md ring-1 transition",
    SCHEDULE_BOARD_LAYER.card,
    SCHEDULE_BOARD_LAYER.cardHover,
    "hover:shadow-lg hover:ring-matchon-primary/30",
    selected && cn(SCHEDULE_BOARD_LAYER.cardActive, "shadow-lg ring-2 ring-matchon-primary"),
    gymStaffColorClass(colorKey),
  );
}

function CardBody({
  item,
  compact,
  starts,
  ends,
  shown,
  height,
}: {
  item: GymCalendarItem;
  compact?: boolean;
  starts: Date;
  ends: Date;
  shown: BoardTimePatch | null;
  height: number;
}) {
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
    <div className={cn("flex h-full gap-1.5 px-1.5 py-1", compact && "py-0.5")}>
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
        {shown && shown.dateKey !== item.dateKey ? (
          <p className="text-[10px] font-medium text-matchon-primary">
            {shown.dateKey.slice(5)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ScheduleBoardCard({
  item,
  dateKey,
  compact,
  selected,
  pending,
  onSelect,
  onRequestEdit,
  onRequestReschedule,
  onDragPreviewChange,
  menuActions,
  insetClassName = "inset-x-1",
  minHeightPx = 28,
}: {
  item: GymCalendarItem;
  dateKey: string;
  compact?: boolean;
  selected?: boolean;
  /** 서버 저장 진행 중(optimistic 반영 상태) 표시 */
  pending?: boolean;
  onSelect: (item: GymCalendarItem) => void;
  onRequestEdit: (item: GymCalendarItem) => void;
  onRequestReschedule: (
    item: GymCalendarItem,
    patch: BoardTimePatch,
  ) => Promise<boolean>;
  onDragPreviewChange?: (
    itemId: string,
    patch: BoardTimePatch | null,
  ) => void;
  menuActions: ScheduleBoardMenuAction[];
  insetClassName?: string;
  minHeightPx?: number;
}) {
  const interactive = canInteract(item);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [localPreview, setLocalPreview] = useState<BoardTimePatch | null>(null);
  const [dragging, setDragging] = useState(false);
  const [overlayPos, setOverlayPos] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const dragRef = useRef<{
    mode: DragMode;
    pointerId: number;
    originX: number;
    originY: number;
    originStartMin: number;
    originEndMin: number;
    durationMin: number;
    targetDateKey: string;
    columnEl: HTMLElement | null;
    grabOffsetX: number;
    grabOffsetY: number;
    cardWidth: number;
    cardHeight: number;
    active: boolean;
    lastPatch: BoardTimePatch | null;
    lastClientX: number;
    lastClientY: number;
    scrollEl: HTMLElement | null;
    originScrollTop: number;
    autoScroll: BoardAutoScroll | null;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const shown = localPreview;
  const starts = shown?.startsAt ?? item.startsAt;
  const ends = shown?.endsAt ?? item.endsAt;
  const placeholderTop = scheduleBlockTopPx(item.startsAt);
  const placeholderHeight = Math.max(
    minHeightPx,
    scheduleBlockHeightPx(item.startsAt, item.endsAt),
  );
  const liveTop = scheduleBlockTopPx(starts);
  const liveHeight = Math.max(
    minHeightPx,
    scheduleBlockHeightPx(starts, ends),
  );
  const showPlaceholder = dragging && Boolean(localPreview);
  const top = showPlaceholder ? placeholderTop : liveTop;
  const height = showPlaceholder ? placeholderHeight : liveHeight;

  const resolveColumn = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    return el?.closest(SCHEDULE_DAY_COLUMN_SELECTOR) as HTMLElement | null;
  }, []);

  function openMenu(x: number, y: number) {
    setMenuAnchor({ x, y });
    setMenuOpen(true);
  }

  function beginDrag(e: ReactPointerEvent, mode: DragMode) {
    if (!interactive) return;
    if (e.button !== 0) return;
    if (!isDragCapablePointer(e.pointerType)) return;
    e.preventDefault();
    e.stopPropagation();
    // 이전 드래그가 click 없이 끝났을 수 있으므로 매번 초기화한다.
    suppressClickRef.current = false;
    const columnEl = (e.currentTarget as HTMLElement).closest(
      SCHEDULE_DAY_COLUMN_SELECTOR,
    ) as HTMLElement | null;
    const scrollEl = columnEl?.closest(
      SCHEDULE_SCROLL_CONTAINER_SELECTOR,
    ) as HTMLElement | null;
    const cardRect = cardRef.current?.getBoundingClientRect();
    const startMin = minutesFromDate(item.startsAt);
    const endMin = minutesFromDate(item.endsAt);
    dragRef.current = {
      mode,
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      originStartMin: startMin,
      originEndMin: endMin,
      durationMin: endMin - startMin,
      targetDateKey: dateKey,
      columnEl,
      grabOffsetX: cardRect ? e.clientX - cardRect.left : 12,
      grabOffsetY: cardRect ? e.clientY - cardRect.top : 12,
      cardWidth: cardRect?.width ?? 120,
      cardHeight: cardRect?.height ?? placeholderHeight,
      active: false,
      lastPatch: null,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      scrollEl,
      originScrollTop: scrollEl?.scrollTop ?? 0,
      autoScroll: createBoardAutoScroll(scrollEl, () => {
        const drag = dragRef.current;
        if (drag?.active) {
          applyPointerPosition(drag, drag.lastClientX, drag.lastClientY);
        }
      }),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function computePatch(
    drag: NonNullable<typeof dragRef.current>,
    clientX: number,
    clientY: number,
  ): BoardTimePatch | null {
    const col = resolveColumn(clientX, clientY) ?? drag.columnEl;
    if (!col) return null;
    const rect = col.getBoundingClientRect();
    const targetDate =
      col.getAttribute("data-schedule-day") || drag.targetDateKey;
    drag.targetDateKey = targetDate;
    drag.columnEl = col;

    const absoluteMin = pointerYToSnappedMinutes(clientY, rect.top);
    // 자동 스크롤로 보드가 움직인 만큼도 이동량에 포함해야 카드가 그리드를 따라간다.
    const scrollDelta =
      (drag.scrollEl?.scrollTop ?? 0) - drag.originScrollTop;
    const deltaMin = snapMinutes(
      (clientY - drag.originY + scrollDelta) / SCHEDULE_PX_PER_MINUTE,
    );

    if (drag.mode === "move") {
      return buildRangeFromMinutes(
        targetDate,
        drag.originStartMin + deltaMin,
        drag.originStartMin + deltaMin + drag.durationMin,
      );
    }
    if (drag.mode === "resize-start") {
      return buildRangeFromMinutes(
        drag.targetDateKey,
        absoluteMin,
        drag.originEndMin,
      );
    }
    return buildRangeFromMinutes(
      drag.targetDateKey,
      drag.originStartMin,
      absoluteMin,
    );
  }

  /** 포인터 위치 → 미리보기 patch + 오버레이 좌표. 자동 스크롤 tick 에서도 재사용한다. */
  function applyPointerPosition(
    drag: NonNullable<typeof dragRef.current>,
    clientX: number,
    clientY: number,
  ) {
    const next = computePatch(drag, clientX, clientY);
    if (!next) return;
    drag.lastPatch = next;
    setLocalPreview(next);
    onDragPreviewChange?.(item.id, next);

    const height = Math.max(
      minHeightPx,
      scheduleBlockHeightPx(next.startsAt, next.endsAt),
    );
    if (drag.mode === "move") {
      setOverlayPos({
        left: clientX - drag.grabOffsetX,
        top: clientY - drag.grabOffsetY,
        width: drag.cardWidth,
        height,
      });
      return;
    }
    // 리사이즈는 컬럼에 붙어 있어야 길이 변화가 읽힌다.
    const colRect = drag.columnEl?.getBoundingClientRect();
    setOverlayPos({
      left: colRect?.left ?? clientX - drag.grabOffsetX,
      top: scheduleBlockTopPx(next.startsAt) + (colRect?.top ?? 0),
      width: drag.cardWidth,
      height,
    });
  }

  function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    drag.lastClientX = e.clientX;
    drag.lastClientY = e.clientY;

    const dx = e.clientX - drag.originX;
    const dy = e.clientY - drag.originY;
    if (!drag.active && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    if (!drag.active) {
      drag.active = true;
      setDragging(true);
      suppressClickRef.current = true;
      document.body.style.userSelect = "none";
    }

    applyPointerPosition(drag, e.clientX, e.clientY);
    drag.autoScroll?.update(
      e.clientY,
      drag.originY,
      drag.mode !== "move",
    );
  }

  async function finishDrag(e: ReactPointerEvent) {
    const drag = dragRef.current;
    const patch = drag?.lastPatch ?? localPreview;
    const wasActive = Boolean(drag?.active);
    drag?.autoScroll?.stop();
    dragRef.current = null;
    setDragging(false);
    setOverlayPos(null);
    document.body.style.userSelect = "";
    onDragPreviewChange?.(item.id, null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // capture may already be released
    }

    if (!drag || !wasActive || !patch) {
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
    // 부모가 optimistic 을 즉시 반영하므로, 넘긴 직후 로컬 미리보기를 비워도
    // 카드는 새 위치에 그대로 남는다(원위치 깜빡임 없음).
    // 실패 시 롤백도 부모의 optimistic 제거로 한 번만 일어난다.
    await onRequestReschedule(item, patch);
    setLocalPreview(null);
  }

  useEffect(() => {
    return () => {
      dragRef.current?.autoScroll?.stop();
      document.body.style.userSelect = "";
    };
  }, []);

  return (
    <>
      <div
        ref={cardRef}
        data-testid="schedule-block"
        data-schedule-id={item.id}
        aria-busy={pending || undefined}
        aria-label={pending ? "저장 중" : undefined}
        className={cn(
          elevatedCardClass(item.colorKey, Boolean(selected || dragging)),
          insetClassName,
          item.itemType === "group_class" && "border-l-[3px] border-l-matchon-primary",
          item.status === "cancelled" && "opacity-50",
          interactive && "cursor-grab active:cursor-grabbing",
          showPlaceholder && "opacity-35 ring-1 ring-dashed ring-matchon-border",
          pending && !dragging && "opacity-90",
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
        onPointerUp={finishDrag}
        onPointerCancel={(e) => {
          const drag = dragRef.current;
          drag?.autoScroll?.stop();
          if (drag?.active) suppressClickRef.current = true;
          dragRef.current = null;
          setDragging(false);
          setOverlayPos(null);
          setLocalPreview(null);
          document.body.style.userSelect = "";
          onDragPreviewChange?.(item.id, null);
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
          } catch {
            // ignore
          }
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
          className="relative h-full"
          onPointerDown={(e) => {
            if (!interactive) return;
            if ((e.target as HTMLElement).closest("[data-menu-trigger]")) return;
            beginDrag(e, "move");
          }}
        >
          <CardBody
            item={item}
            compact={compact}
            starts={showPlaceholder ? item.startsAt : starts}
            ends={showPlaceholder ? item.endsAt : ends}
            shown={showPlaceholder ? null : shown}
            height={showPlaceholder ? placeholderHeight : height}
          />
          <button
            type="button"
            data-menu-trigger
            aria-label="더보기"
            className="absolute right-1 top-1 rounded p-0.5 text-matchon-text-secondary opacity-70 hover:bg-black/5 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              openMenu(r.right, r.bottom);
            }}
          >
            ⋯
          </button>
          {pending ? (
            <span
              data-testid="schedule-pending"
              className="absolute left-1 top-1 size-2.5 animate-pulse rounded-full bg-matchon-primary/80"
              aria-hidden
            />
          ) : null}
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

      {dragging && overlayPos && localPreview && typeof document !== "undefined"
        ? createPortal(
            <div
              data-testid="schedule-drag-overlay"
              className={cn(
                elevatedCardClass(item.colorKey, true),
                SCHEDULE_BOARD_LAYER.dragOverlay,
                "pointer-events-none fixed cursor-grabbing opacity-[0.88] shadow-[0_12px_28px_rgba(15,23,42,0.22)] ring-2 ring-matchon-primary/40",
                item.itemType === "group_class" &&
                  "border-l-[3px] border-l-matchon-primary",
              )}
              style={{
                left: overlayPos.left,
                top: overlayPos.top,
                width: overlayPos.width,
                height: overlayPos.height,
                transform: "scale(1.02)",
              }}
              aria-hidden
            >
              <CardBody
                item={item}
                compact={compact}
                starts={localPreview.startsAt}
                ends={localPreview.endsAt}
                shown={localPreview}
                height={overlayPos.height}
              />
            </div>,
            document.body,
          )
        : null}

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
