"use client";

import Link from "next/link";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GymScheduleFormDialog } from "@/components/domain/gym-schedules/GymScheduleFormDialog";
import { GymScheduleDetailSheet } from "@/components/domain/gym-schedules/GymScheduleDetailSheet";
import { GymCalendarGroupClassDetailDialog } from "@/components/domain/gym-schedules/GymCalendarGroupClassDetailDialog";
import {
  ScheduleBoardCard,
  type BoardTimePatch,
} from "@/components/domain/gym-schedules/ScheduleBoardCard";
import type { ScheduleBoardMenuAction } from "@/components/domain/gym-schedules/ScheduleBoardCardMenu";
import { ScheduleNowLine } from "@/components/domain/gym-schedules/ScheduleNowLine";
import { Button, buttonVariants } from "@/components/ui/button";
import { rescheduleGymScheduleAction } from "@/features/gym-schedules/actions";
import { rescheduleGymGroupClassAction } from "@/features/gym-group-classes/actions";
import { gymStaffColorClass } from "@/lib/gym-schedule/labels";
import { TEN_MINUTE_TIME_OPTIONS } from "@/lib/gym-schedule/hours";
import { durationLabel } from "@/lib/gym-schedule/board-geometry";
import {
  SCHEDULE_GRID_END_HOUR,
  SCHEDULE_GRID_START_HOUR,
  SCHEDULE_PX_PER_MINUTE,
  createSeoulDateTime,
  formatSeoulScheduleTime,
  getSeoulScheduleWeekRange,
  getSeoulYmdParts,
  scheduleGridTotalHeightPx,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";
import {
  matchonToolbarButtonClass,
  matchonToolbarControlClass,
  matchonToolbarSegmentClass,
  matchonToolbarSegmentItemClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";
import type { GymCalendarItem } from "@/lib/gym-schedule/calendar-item";
import type { GymScheduleVM } from "@/lib/services/gym-schedule.service";

export type ScheduleStaffOption = {
  id: string;
  name: string;
  title: string | null;
  colorKey: string | null;
};

export type ScheduleMemberOption = {
  id: string;
  name: string;
  memberNumber: string;
  phoneMasked: string;
  status: string;
  profileImageUrl: string | null;
  primaryStaffName: string | null;
  planLabel: string | null;
};

type ViewMode = "month" | "week" | "day" | "list";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function shiftDateKey(dateKey: string, days: number): string {
  const at = createSeoulDateTime(dateKey, "12:00");
  at.setTime(at.getTime() + days * 24 * 60 * 60 * 1000);
  return toSeoulDateKey(at);
}

function shiftMonth(dateKey: string, delta: number): string {
  const { year, month, day } = getSeoulYmdParts(
    createSeoulDateTime(dateKey, "12:00"),
  );
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = next.getUTCFullYear();
  const m = next.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = Math.min(day, lastDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthCells(dateKey: string) {
  const { year, month } = getSeoulYmdParts(createSeoulDateTime(dateKey, "12:00"));
  const firstKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const first = createSeoulDateTime(firstKey, "12:00");
  const dow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const start = new Date(first.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
  const cells: { dateKey: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const at = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = toSeoulDateKey(at);
    const parts = getSeoulYmdParts(at);
    cells.push({ dateKey: key, inMonth: parts.month === month });
  }
  return { year, month, cells };
}

function slotHmFromDoubleClick(clientY: number, columnTop: number): string {
  const raw =
    SCHEDULE_GRID_START_HOUR * 60 +
    (clientY - columnTop) / SCHEDULE_PX_PER_MINUTE;
  const snapped = Math.round(raw / 10) * 10;
  const h = Math.floor(snapped / 60);
  const m = snapped % 60;
  return `${String(Math.max(SCHEDULE_GRID_START_HOUR, Math.min(23, h))).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function GymScheduleCalendarApp({
  initialItems,
  summary,
  staffOptions,
  memberOptions,
  viewer,
  fixedStaffId,
  myOnly,
  defaultStaffId,
}: {
  initialItems: GymCalendarItem[];
  summary: {
    todayScheduled: number;
    todayCompleted: number;
    todayNoShow: number;
    weekScheduled: number;
    weekNoShow: number;
    weekCancelled: number;
  };
  staffOptions: ScheduleStaffOption[];
  memberOptions: ScheduleMemberOption[];
  viewer: "owner" | "staff";
  fixedStaffId: string | null;
  myOnly: boolean;
  defaultStaffId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const viewRaw = searchParams.get("view") as ViewMode | null;
  const view: ViewMode =
    viewRaw === "month" ||
    viewRaw === "week" ||
    viewRaw === "day" ||
    viewRaw === "list"
      ? viewRaw
      : viewer === "staff"
        ? "day"
        : "week";
  const dateKey = searchParams.get("date") || toSeoulDateKey(new Date());
  const staffFilter = fixedStaffId || searchParams.get("staffId") || "";
  const statusFilter = searchParams.get("status") || "active";
  const itemKindFilter =
    (searchParams.get("kind") as "all" | "personal" | "group_class") || "all";
  const [q, setQ] = useState(searchParams.get("q") || "");

  const [selected, setSelected] = useState<GymCalendarItem | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GymCalendarItem | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<{
    dateKey: string;
    startHm: string;
    staffId: string;
    memberId?: string;
    scheduleId?: string;
  } | null>(null);
  const [mobileWeekDay, setMobileWeekDay] = useState(dateKey);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<
    Record<string, BoardTimePatch>
  >({});
  const weekScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<{ week: number; windowY: number }>({
    week: 0,
    windowY: 0,
  });
  const pendingReopenPersonalIdRef = useRef<string | null>(null);

  function captureScrollPosition() {
    scrollPositionRef.current = {
      week: weekScrollRef.current?.scrollTop ?? 0,
      windowY: typeof window !== "undefined" ? window.scrollY : 0,
    };
  }

  function restoreScrollPosition() {
    const { week, windowY } = scrollPositionRef.current;
    requestAnimationFrame(() => {
      if (weekScrollRef.current) weekScrollRef.current.scrollTop = week;
      if (typeof window !== "undefined") window.scrollTo(0, windowY);
    });
  }

  function pushQuery(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initialItems
      .map((item) => {
        const patch = optimistic[item.id];
        if (!patch) return item;
        return {
          ...item,
          dateKey: patch.dateKey,
          startsAt: patch.startsAt,
          endsAt: patch.endsAt,
          timeRangeLabel: `${patch.startHm}–${patch.endHm}`,
        };
      })
      .filter((item) => {
        if (itemKindFilter === "personal" && item.itemType !== "personal") {
          return false;
        }
        if (
          itemKindFilter === "group_class" &&
          item.itemType !== "group_class"
        ) {
          return false;
        }
        if (staffFilter && item.staffId !== staffFilter) return false;
        if (statusFilter === "active" && item.status === "cancelled") {
          return false;
        }
        if (
          statusFilter !== "all" &&
          statusFilter !== "active" &&
          item.status !== statusFilter
        ) {
          return false;
        }
        if (!needle) return true;
        const hay = [
          item.title,
          item.memberName,
          item.staffName,
          item.scheduleTypeLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
  }, [
    initialItems,
    staffFilter,
    statusFilter,
    itemKindFilter,
    q,
    optimistic,
  ]);

  const byDate = useMemo(() => {
    const map = new Map<string, GymCalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.dateKey) ?? [];
      list.push(item);
      map.set(item.dateKey, list);
    }
    return map;
  }, [items]);

  const todayKey = toSeoulDateKey(new Date());
  const title =
    view === "month"
      ? (() => {
          const { year, month } = getSeoulYmdParts(
            createSeoulDateTime(dateKey, "12:00"),
          );
          return `${year}년 ${month}월`;
        })()
      : view === "week" || view === "list"
        ? (() => {
            const w = getSeoulScheduleWeekRange(
              createSeoulDateTime(dateKey, "12:00"),
            );
            return `${w.startKey} ~ ${shiftDateKey(w.startKey, 6)}`;
          })()
        : dateKey;

  function openCreate(opts?: {
    dateKey?: string;
    startHm?: string;
    memberId?: string;
  }) {
    setFormDefaults({
      dateKey: opts?.dateKey || dateKey,
      startHm: opts?.startHm || "15:00",
      staffId: fixedStaffId || defaultStaffId || staffOptions[0]?.id || "",
      memberId: opts?.memberId,
    });
    setFormOpen(true);
  }

  function openEdit(item: GymCalendarItem) {
    if (item.itemType !== "personal") return;
    captureScrollPosition();
    pendingReopenPersonalIdRef.current = item.id;
    setFormDefaults({
      dateKey: item.dateKey,
      startHm: formatSeoulScheduleTime(item.startsAt),
      staffId: item.staffId ?? "",
      memberId: item.memberId ?? undefined,
      scheduleId: item.id,
    });
    setSelected(null);
    setFormOpen(true);
  }

  function onItemClick(item: GymCalendarItem) {
    captureScrollPosition();
    if (item.itemType === "group_class") {
      setSelectedGroup(item);
      return;
    }
    setSelected(item);
  }

  function closePersonalDetail() {
    setSelected(null);
    restoreScrollPosition();
  }

  function closeGroupDetail() {
    setSelectedGroup(null);
    restoreScrollPosition();
  }

  function toPersonalVm(item: GymCalendarItem): GymScheduleVM {
    return {
      id: item.id,
      gymId: "",
      gymStaffId: item.staffId ?? "",
      gymMemberId: item.memberId ?? "",
      title: item.title,
      scheduleType:
        (item.scheduleType as GymScheduleVM["scheduleType"]) ||
        "personal_training",
      scheduleTypeLabel: item.scheduleTypeLabel || "",
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      dateKey: item.dateKey,
      timeRangeLabel: item.timeRangeLabel,
      status: item.status as GymScheduleVM["status"],
      statusLabel: item.statusLabel,
      location: item.location ?? null,
      memo: item.memo ?? null,
      colorKey: item.colorKey,
      staffName: item.staffName || "",
      staffTitle: null,
      staffColorKey: item.colorKey,
      memberName: item.memberName || "",
      memberNumber: "",
      memberPhoneMasked: "",
      memberStatus: "",
      memberProfileImageUrl: item.memberProfileImageUrl,
      canManage: item.canManage,
    };
  }

  const requestReschedule = useCallback(
    async (item: GymCalendarItem, patch: BoardTimePatch) => {
      setBoardError(null);
      setOptimistic((prev) => ({ ...prev, [item.id]: patch }));
      const fd = new FormData();
      fd.set("dateKey", patch.dateKey);
      fd.set("startHm", patch.startHm);
      fd.set("endHm", patch.endHm);
      const result =
        item.itemType === "group_class"
          ? await rescheduleGymGroupClassAction(item.id, fd)
          : await rescheduleGymScheduleAction(item.id, fd);
      if (!result.ok) {
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        setBoardError(result.error.message);
        return false;
      }
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      startTransition(() => router.refresh());
      return true;
    },
    [router, startTransition],
  );

  function buildMenuActions(item: GymCalendarItem): ScheduleBoardMenuAction[] {
    const actions: ScheduleBoardMenuAction[] = [];
    if (item.itemType === "personal") {
      if (item.canManage && item.status === "scheduled") {
        actions.push({
          id: "edit",
          label: "일정 수정",
          onSelect: () => openEdit(item),
        });
        actions.push({
          id: "detail",
          label: "상세 보기",
          onSelect: () => onItemClick(item),
        });
      } else {
        actions.push({
          id: "detail",
          label: "상세 보기",
          onSelect: () => onItemClick(item),
        });
      }
      if (item.memberId) {
        actions.push({
          id: "member",
          label: "회원 상세 보기",
          onSelect: () => {
            router.push(`/gym/members/${item.memberId}`);
          },
        });
      }
    } else {
      actions.push({
        id: "detail",
        label: "수업 상세",
        onSelect: () => onItemClick(item),
      });
      if (item.canManage && item.status === "scheduled") {
        actions.push({
          id: "edit",
          label: "수업 상세·상태",
          onSelect: () => onItemClick(item),
        });
      }
      actions.push({
        id: "participants",
        label: "참석자 관리",
        onSelect: () => {
          router.push(`/gym/group-classes/${item.id}`);
        },
      });
    }
    return actions;
  }

  const weekDays = useMemo(() => {
    const w = getSeoulScheduleWeekRange(createSeoulDateTime(dateKey, "12:00"));
    return Array.from({ length: 7 }, (_, i) => shiftDateKey(w.startKey, i));
  }, [dateKey]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryChip label="오늘 예정" value={summary.todayScheduled} />
        <SummaryChip label="오늘 완료" value={summary.todayCompleted} />
        <SummaryChip label="이번 주 예정" value={summary.weekScheduled} />
        <SummaryChip label="이번 주 노쇼" value={summary.weekNoShow} />
        <SummaryChip label="이번 주 취소" value={summary.weekCancelled} />
      </div>

      <p className="text-xs text-matchon-text-secondary">
        {myOnly
          ? "내 일정: 로그인한 선생님의 개인 일정과 담당 그룹수업만 표시합니다."
          : "전체 일정: 체육관 전체 선생님의 일정과 그룹수업을 표시합니다."}
      </p>

      {boardError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {boardError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setBoardError(null)}
          >
            닫기
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={matchonToolbarButtonClass}
            onClick={() =>
              pushQuery({
                date:
                  view === "month"
                    ? shiftMonth(dateKey, -1)
                    : shiftDateKey(
                        dateKey,
                        view === "week" || view === "list" ? -7 : -1,
                      ),
              })
            }
          >
            이전
          </Button>
          <Button
            type="button"
            variant="outline"
            className={matchonToolbarButtonClass}
            onClick={() => pushQuery({ date: todayKey })}
          >
            오늘
          </Button>
          <Button
            type="button"
            variant="outline"
            className={matchonToolbarButtonClass}
            onClick={() =>
              pushQuery({
                date:
                  view === "month"
                    ? shiftMonth(dateKey, 1)
                    : shiftDateKey(
                        dateKey,
                        view === "week" || view === "list" ? 7 : 1,
                      ),
              })
            }
          >
            다음
          </Button>
          <div className={matchonToolbarSegmentClass}>
            {(["month", "week", "day", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                className={cn(
                  matchonToolbarSegmentItemClass,
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-matchon-text-secondary",
                )}
                onClick={() => pushQuery({ view: v })}
              >
                {v === "month"
                  ? "월"
                  : v === "week"
                    ? "주"
                    : v === "day"
                      ? "일"
                      : "목록"}
              </button>
            ))}
          </div>
          <p className="flex h-10 min-w-0 items-center text-sm font-medium">
            {title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {viewer === "owner" && !fixedStaffId ? (
            <select
              className={cn(matchonToolbarControlClass, "min-w-[140px]")}
              value={staffFilter}
              onChange={(e) =>
                pushQuery({ staffId: e.target.value || null })
              }
              aria-label="선생님 필터"
            >
              <option value="">전체 선생님</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
          <select
            className={matchonToolbarControlClass}
            value={itemKindFilter}
            onChange={(e) => pushQuery({ kind: e.target.value || "all" })}
            aria-label="일정 종류"
          >
            <option value="all">전체 종류</option>
            <option value="personal">개인 일정</option>
            <option value="group_class">그룹수업</option>
          </select>
          <select
            className={matchonToolbarControlClass}
            value={statusFilter}
            onChange={(e) => pushQuery({ status: e.target.value })}
            aria-label="상태 필터"
          >
            <option value="active">취소 제외</option>
            <option value="all">전체 상태</option>
            <option value="scheduled">예정</option>
            <option value="completed">완료</option>
            <option value="no_show">노쇼</option>
            <option value="cancelled">취소</option>
          </select>
          <input
            type="search"
            className={cn(matchonToolbarControlClass, "min-w-[160px]")}
            placeholder="일정명·회원 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="일정 검색"
          />
          <Button
            type="button"
            className={matchonToolbarButtonClass}
            onClick={() => {
              captureScrollPosition();
              openCreate();
            }}
          >
            일정 등록
          </Button>
        </div>
      </div>

      {view === "month" ? (
        <MonthView
          dateKey={dateKey}
          byDate={byDate}
          todayKey={todayKey}
          onDayClick={(key) => pushQuery({ view: "day", date: key })}
          onItemClick={onItemClick}
        />
      ) : null}

      {view === "week" ? (
        <>
          <div className="hidden md:block">
            <WeekDesktop
              weekDays={weekDays}
              byDate={byDate}
              todayKey={todayKey}
              scrollRef={weekScrollRef}
              onItemClick={onItemClick}
              onRequestEdit={(item) => {
                if (item.itemType === "personal") openEdit(item);
                else onItemClick(item);
              }}
              onRequestReschedule={requestReschedule}
              buildMenuActions={buildMenuActions}
              onSlotClick={(dk, hm) => {
                captureScrollPosition();
                openCreate({ dateKey: dk, startHm: hm });
              }}
            />
          </div>
          <div className="space-y-3 md:hidden">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {weekDays.map((dk, i) => {
                const count = byDate.get(dk)?.length ?? 0;
                const active = (mobileWeekDay || dateKey) === dk;
                return (
                  <button
                    key={dk}
                    type="button"
                    className={cn(
                      "min-w-[3rem] rounded-lg border px-2 py-2 text-center text-xs",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-matchon-border",
                    )}
                    onClick={() => {
                      setMobileWeekDay(dk);
                      pushQuery({ date: dk });
                    }}
                  >
                    <div>{WEEKDAY_LABELS[i]}</div>
                    <div className="font-semibold">{Number(dk.slice(-2))}</div>
                    <div className="text-matchon-text-secondary">{count}</div>
                  </button>
                );
              })}
            </div>
            <DayTimeline
              dateKey={mobileWeekDay || dateKey}
              items={byDate.get(mobileWeekDay || dateKey) ?? []}
              onItemClick={onItemClick}
              onRequestEdit={(item) => {
                if (item.itemType === "personal") openEdit(item);
                else onItemClick(item);
              }}
              onRequestReschedule={requestReschedule}
              buildMenuActions={buildMenuActions}
              onSlotClick={(hm) =>
                openCreate({ dateKey: mobileWeekDay || dateKey, startHm: hm })
              }
            />
          </div>
        </>
      ) : null}

      {view === "day" ? (
        <DayTimeline
          dateKey={dateKey}
          items={byDate.get(dateKey) ?? []}
          onItemClick={onItemClick}
          onRequestEdit={(item) => {
            if (item.itemType === "personal") openEdit(item);
            else onItemClick(item);
          }}
          onRequestReschedule={requestReschedule}
          buildMenuActions={buildMenuActions}
          onSlotClick={(hm) => {
            captureScrollPosition();
            openCreate({ dateKey, startHm: hm });
          }}
        />
      ) : null}

      {view === "list" ? (
        <ListView
          items={items}
          onItemClick={onItemClick}
        />
      ) : null}

      <GymScheduleDetailSheet
        item={selected ? toPersonalVm(selected) : null}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) closePersonalDetail();
        }}
        onEdit={() => selected && openEdit(selected)}
        onChanged={() => {
          setSelected(null);
          restoreScrollPosition();
          router.refresh();
        }}
      />

      <GymCalendarGroupClassDetailDialog
        item={selectedGroup}
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => {
          if (!open) closeGroupDetail();
        }}
        onChanged={() => {
          setSelectedGroup(null);
          restoreScrollPosition();
          router.refresh();
        }}
      />

      <GymScheduleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            const reopenId = pendingReopenPersonalIdRef.current;
            pendingReopenPersonalIdRef.current = null;
            if (reopenId) {
              const found = initialItems.find((i) => i.id === reopenId);
              if (found && found.itemType === "personal") {
                setSelected(found);
              }
            }
            restoreScrollPosition();
          }
        }}
        staffOptions={staffOptions}
        memberOptions={memberOptions}
        fixedStaffId={fixedStaffId}
        defaults={formDefaults}
        existing={
          formDefaults?.scheduleId
            ? (() => {
                const found = initialItems.find(
                  (i) => i.id === formDefaults.scheduleId,
                );
                return found ? toPersonalVm(found) : null;
              })()
            : null
        }
        onSaved={() => {
          pendingReopenPersonalIdRef.current = null;
          setFormOpen(false);
          restoreScrollPosition();
          router.refresh();
        }}
      />

      <p className="text-xs text-matchon-text-secondary">
        시작·종료는 10분 단위입니다. 같은 선생님·같은 회원 일정은 겹칠 수
        없습니다. 카드를 드래그하거나 상·하단을 조절해 시간을 변경할 수
        있습니다.
        {myOnly ? " (내 일정 범위)" : " (전체 일정 범위)"}
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/gym/members"
          className={buttonVariants({ variant: "link", size: "sm" })}
        >
          회원 목록
        </Link>
        {TEN_MINUTE_TIME_OPTIONS.length ? null : null}
      </div>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-matchon-border bg-matchon-surface/40 px-3 py-2">
      <p className="text-xs text-matchon-text-secondary">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MonthView({
  dateKey,
  byDate,
  todayKey,
  onDayClick,
  onItemClick,
}: {
  dateKey: string;
  byDate: Map<string, GymCalendarItem[]>;
  todayKey: string;
  onDayClick: (key: string) => void;
  onItemClick: (item: GymCalendarItem) => void;
}) {
  const { cells } = monthCells(dateKey);
  return (
    <div className="overflow-hidden rounded-xl border border-matchon-border bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-matchon-border bg-matchon-surface/50 text-center text-xs font-medium">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-1 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const list = byDate.get(cell.dateKey) ?? [];
          const visible = list.slice(0, 3);
          const more = list.length - visible.length;
          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onDayClick(cell.dateKey)}
              className={cn(
                "min-h-[88px] border-b border-r border-matchon-border p-1 text-left align-top md:min-h-[110px]",
                !cell.inMonth && "bg-muted/30 text-muted-foreground",
                cell.dateKey === todayKey && "ring-1 ring-inset ring-primary",
              )}
            >
              <div className="mb-1 text-xs font-medium">
                {Number(cell.dateKey.slice(-2))}
              </div>
              <div className="space-y-0.5">
                {visible.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    data-testid="schedule-block"
                    className={cn(
                      "truncate rounded-md px-1 py-0.5 text-[10px] shadow-sm ring-1 ring-inset md:text-[11px]",
                      gymStaffColorClass(item.colorKey),
                      item.itemType === "group_class" && "font-medium",
                      item.status === "cancelled" && "opacity-50 line-through",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onItemClick(item);
                      }
                    }}
                  >
                    <span className="hidden md:inline">
                      {item.timeRangeLabel.slice(0, 5)}{" "}
                    </span>
                    {item.itemType === "group_class"
                      ? `${item.title}${
                          item.capacity != null
                            ? ` ${item.participantCount ?? 0}/${item.capacity}`
                            : ""
                        }`
                      : item.memberName}
                  </div>
                ))}
                {more > 0 ? (
                  <div className="text-[10px] text-matchon-text-secondary">
                    +{more}개
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekDesktop({
  weekDays,
  byDate,
  todayKey,
  scrollRef,
  onItemClick,
  onRequestEdit,
  onRequestReschedule,
  buildMenuActions,
  onSlotClick,
}: {
  weekDays: string[];
  byDate: Map<string, GymCalendarItem[]>;
  todayKey: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  onItemClick: (item: GymCalendarItem) => void;
  onRequestEdit: (item: GymCalendarItem) => void;
  onRequestReschedule: (
    item: GymCalendarItem,
    patch: BoardTimePatch,
  ) => Promise<boolean>;
  buildMenuActions: (item: GymCalendarItem) => ScheduleBoardMenuAction[];
  onSlotClick: (dateKey: string, hm: string) => void;
}) {
  const height = scheduleGridTotalHeightPx();
  const hours = Array.from(
    { length: SCHEDULE_GRID_END_HOUR - SCHEDULE_GRID_START_HOUR },
    (_, i) => SCHEDULE_GRID_START_HOUR + i,
  );
  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-xl border border-matchon-border bg-white shadow-sm"
      data-testid="schedule-week-scroll"
    >
      <div className="sticky top-0 z-10 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-matchon-border bg-background">
        <div />
        {weekDays.map((dk, i) => (
          <div
            key={dk}
            className={cn(
              "border-l border-matchon-border px-2 py-2 text-center text-xs",
              dk === todayKey && "bg-primary/5 font-semibold",
            )}
          >
            {WEEKDAY_LABELS[i]} {Number(dk.slice(-2))}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]"
        style={{ height }}
      >
        <div className="relative border-r border-matchon-border bg-matchon-surface/20">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1 -translate-y-1/2 text-[10px] text-matchon-text-secondary"
              style={{
                top:
                  (h - SCHEDULE_GRID_START_HOUR) *
                  60 *
                  SCHEDULE_PX_PER_MINUTE,
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {weekDays.map((dk) => (
          <div
            key={dk}
            data-schedule-day={dk}
            className="relative border-l border-matchon-border bg-[linear-gradient(to_bottom,transparent_calc(100%-1px),rgba(0,0,0,0.03)_calc(100%-1px))]"
            onDoubleClick={(e) => {
              const rect = (
                e.currentTarget as HTMLElement
              ).getBoundingClientRect();
              onSlotClick(dk, slotHmFromDoubleClick(e.clientY, rect.top));
            }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-dashed border-matchon-border/50"
                style={{
                  top:
                    (h - SCHEDULE_GRID_START_HOUR) *
                    60 *
                    SCHEDULE_PX_PER_MINUTE,
                }}
              />
            ))}
            <ScheduleNowLine dateKey={dk} />
            {(byDate.get(dk) ?? []).map((item) => (
              <ScheduleBoardCard
                key={item.id}
                item={item}
                dateKey={dk}
                compact
                onSelect={onItemClick}
                onRequestEdit={onRequestEdit}
                onRequestReschedule={onRequestReschedule}
                menuActions={buildMenuActions(item)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayTimeline({
  dateKey,
  items,
  onItemClick,
  onRequestEdit,
  onRequestReschedule,
  buildMenuActions,
  onSlotClick,
}: {
  dateKey: string;
  items: GymCalendarItem[];
  onItemClick: (item: GymCalendarItem) => void;
  onRequestEdit: (item: GymCalendarItem) => void;
  onRequestReschedule: (
    item: GymCalendarItem,
    patch: BoardTimePatch,
  ) => Promise<boolean>;
  buildMenuActions: (item: GymCalendarItem) => ScheduleBoardMenuAction[];
  onSlotClick: (hm: string) => void;
}) {
  const height = scheduleGridTotalHeightPx();
  const hours = Array.from(
    { length: SCHEDULE_GRID_END_HOUR - SCHEDULE_GRID_START_HOUR },
    (_, i) => SCHEDULE_GRID_START_HOUR + i,
  );

  return (
    <div className="overflow-hidden rounded-xl border border-matchon-border bg-white shadow-sm">
      <div className="border-b border-matchon-border px-3 py-2 text-sm font-medium">
        {dateKey}
        <button
          type="button"
          className="ml-3 text-xs text-primary underline"
          onClick={() => onSlotClick("15:00")}
        >
          빈 시간에 등록
        </button>
      </div>
      <div
        className="relative grid grid-cols-[56px_minmax(0,1fr)]"
        style={{ height }}
      >
        <div className="relative border-r border-matchon-border bg-matchon-surface/20">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1 -translate-y-1/2 text-[10px] text-matchon-text-secondary"
              style={{
                top:
                  (h - SCHEDULE_GRID_START_HOUR) *
                  60 *
                  SCHEDULE_PX_PER_MINUTE,
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div
          className="relative"
          data-schedule-day={dateKey}
          onDoubleClick={(e) => {
            const rect = (
              e.currentTarget as HTMLElement
            ).getBoundingClientRect();
            onSlotClick(slotHmFromDoubleClick(e.clientY, rect.top));
          }}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-dashed border-matchon-border/50"
              style={{
                top:
                  (h - SCHEDULE_GRID_START_HOUR) *
                  60 *
                  SCHEDULE_PX_PER_MINUTE,
              }}
            />
          ))}
          <ScheduleNowLine dateKey={dateKey} />
          {items.length === 0 ? (
            <p className="absolute left-3 top-3 text-sm text-matchon-text-secondary">
              등록된 일정이 없습니다.
            </p>
          ) : null}
          {items.map((item) => (
            <ScheduleBoardCard
              key={item.id}
              item={item}
              dateKey={dateKey}
              insetClassName="inset-x-2"
              minHeightPx={48}
              onSelect={onItemClick}
              onRequestEdit={onRequestEdit}
              onRequestReschedule={onRequestReschedule}
              menuActions={buildMenuActions(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ListView({
  items,
  onItemClick,
}: {
  items: GymCalendarItem[];
  onItemClick: (item: GymCalendarItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-matchon-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-matchon-border bg-matchon-surface/40 text-xs text-matchon-text-secondary">
          <tr>
            <th className="px-3 py-2 font-medium">날짜·시간</th>
            <th className="px-3 py-2 font-medium">일정</th>
            <th className="px-3 py-2 font-medium">선생님</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">소요</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-8 text-center text-matchon-text-secondary"
              >
                표시할 일정이 없습니다.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={item.id}
                data-testid="schedule-block"
                className="cursor-pointer border-b border-matchon-border/70 hover:bg-matchon-surface/40"
                onClick={() => onItemClick(item)}
              >
                <td className="px-3 py-2 tabular-nums">
                  <div>{item.dateKey}</div>
                  <div className="text-xs text-matchon-text-secondary">
                    {item.timeRangeLabel}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">
                    {item.itemType === "group_class"
                      ? item.title
                      : item.memberName}
                  </div>
                  <div className="text-xs text-matchon-text-secondary">
                    {item.itemType === "group_class"
                      ? "그룹수업"
                      : item.scheduleTypeLabel}
                  </div>
                </td>
                <td className="px-3 py-2">{item.staffName || "—"}</td>
                <td className="px-3 py-2">{item.statusLabel}</td>
                <td className="px-3 py-2 tabular-nums">
                  {durationLabel(item.startsAt, item.endsAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
