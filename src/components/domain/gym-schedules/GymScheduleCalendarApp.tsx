"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { GymScheduleFormDialog } from "@/components/domain/gym-schedules/GymScheduleFormDialog";
import { GymScheduleDetailSheet } from "@/components/domain/gym-schedules/GymScheduleDetailSheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { gymStaffColorClass } from "@/lib/gym-schedule/labels";
import { TEN_MINUTE_TIME_OPTIONS } from "@/lib/gym-schedule/hours";
import {
  SCHEDULE_GRID_END_HOUR,
  SCHEDULE_GRID_START_HOUR,
  SCHEDULE_PX_PER_MINUTE,
  createSeoulDateTime,
  getSeoulScheduleWeekRange,
  getSeoulYmdParts,
  scheduleBlockHeightPx,
  scheduleBlockTopPx,
  scheduleGridTotalHeightPx,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
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

type ViewMode = "month" | "week" | "day";

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
  const dow = new Date(
    Date.UTC(year, month - 1, 1),
  ).getUTCDay();
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

  const view = (searchParams.get("view") as ViewMode) || (viewer === "staff" ? "day" : "week");
  const dateKey =
    searchParams.get("date") || toSeoulDateKey(new Date());
  const staffFilter =
    fixedStaffId || searchParams.get("staffId") || "";
  const statusFilter = searchParams.get("status") || "active";
  const itemKindFilter =
    (searchParams.get("kind") as "all" | "personal" | "group_class") || "all";

  const [selected, setSelected] = useState<GymCalendarItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<{
    dateKey: string;
    startHm: string;
    staffId: string;
    memberId?: string;
    scheduleId?: string;
  } | null>(null);
  const [mobileWeekDay, setMobileWeekDay] = useState(dateKey);

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
    return initialItems.filter((item) => {
      if (itemKindFilter === "personal" && item.itemType !== "personal") {
        return false;
      }
      if (itemKindFilter === "group_class" && item.itemType !== "group_class") {
        return false;
      }
      if (staffFilter && item.staffId !== staffFilter) return false;
      if (statusFilter === "active" && item.status === "cancelled") return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "active" &&
        item.status !== statusFilter
      ) {
        return false;
      }
      return true;
    });
  }, [initialItems, staffFilter, statusFilter, itemKindFilter]);

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
      : view === "week"
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
    setFormDefaults({
      dateKey: item.dateKey,
      startHm: item.timeRangeLabel.slice(0, 5),
      staffId: item.staffId ?? "",
      memberId: item.memberId ?? undefined,
      scheduleId: item.id,
    });
    setSelected(null);
    setFormOpen(true);
  }

  function onItemClick(item: GymCalendarItem) {
    if (item.itemType === "group_class") {
      router.push(`/gym/group-classes/${item.id}`);
      return;
    }
    setSelected(item);
  }

  function toPersonalVm(item: GymCalendarItem): GymScheduleVM {
    return {
      id: item.id,
      gymId: "",
      gymStaffId: item.staffId ?? "",
      gymMemberId: item.memberId ?? "",
      title: item.title,
      scheduleType: (item.scheduleType as GymScheduleVM["scheduleType"]) || "personal_training",
      scheduleTypeLabel: item.scheduleTypeLabel || "",
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      dateKey: item.dateKey,
      timeRangeLabel: item.timeRangeLabel,
      status: item.status as GymScheduleVM["status"],
      statusLabel: item.statusLabel,
      location: null,
      memo: null,
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

  const weekDays = useMemo(() => {
    const w = getSeoulScheduleWeekRange(createSeoulDateTime(dateKey, "12:00"));
    return Array.from({ length: 7 }, (_, i) => shiftDateKey(w.startKey, i));
  }, [dateKey]);

  const nowLineTop = (() => {
    const now = new Date();
    if (toSeoulDateKey(now) !== (view === "week" ? mobileWeekDay : dateKey) && view === "day") {
      /* still compute for day */
    }
    return scheduleBlockTopPx(now);
  })();

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryChip label="오늘 예정" value={summary.todayScheduled} />
        <SummaryChip label="오늘 완료" value={summary.todayCompleted} />
        <SummaryChip label="이번 주 예정" value={summary.weekScheduled} />
        <SummaryChip label="이번 주 노쇼" value={summary.weekNoShow} />
        <SummaryChip label="이번 주 취소" value={summary.weekCancelled} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            pushQuery({
              date:
                view === "month"
                  ? shiftMonth(dateKey, -1)
                  : shiftDateKey(dateKey, view === "week" ? -7 : -1),
            })
          }
        >
          이전
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => pushQuery({ date: todayKey })}
        >
          오늘
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            pushQuery({
              date:
                view === "month"
                  ? shiftMonth(dateKey, 1)
                  : shiftDateKey(dateKey, view === "week" ? 7 : 1),
            })
          }
        >
          다음
        </Button>
        <div className="flex rounded-lg border border-matchon-border p-0.5">
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-matchon-text-secondary",
              )}
              onClick={() => pushQuery({ view: v })}
            >
              {v === "month" ? "월간" : v === "week" ? "주간" : "일간"}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 text-sm font-medium">{title}</p>
        {viewer === "owner" && !fixedStaffId ? (
          <select
            className={cn(matchonFieldInputClass, "w-auto min-w-[140px]")}
            value={staffFilter}
            onChange={(e) =>
              pushQuery({ staffId: e.target.value || null })
            }
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
          className={cn(matchonFieldInputClass, "w-auto")}
          value={itemKindFilter}
          onChange={(e) => pushQuery({ kind: e.target.value || "all" })}
        >
          <option value="all">전체 일정</option>
          <option value="personal">개인 일정</option>
          <option value="group_class">그룹수업</option>
        </select>
        <select
          className={cn(matchonFieldInputClass, "w-auto")}
          value={statusFilter}
          onChange={(e) => pushQuery({ status: e.target.value })}
        >
          <option value="active">취소 제외</option>
          <option value="all">전체 상태</option>
          <option value="scheduled">예정</option>
          <option value="completed">완료</option>
          <option value="no_show">노쇼</option>
          <option value="cancelled">취소</option>
        </select>
        <Button type="button" size="sm" onClick={() => openCreate()}>
          일정 등록
        </Button>
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
              nowTop={nowLineTop}
              onItemClick={onItemClick}
              onSlotClick={(dk, hm) => openCreate({ dateKey: dk, startHm: hm })}
            />
          </div>
          <div className="md:hidden space-y-3">
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
              nowTop={nowLineTop}
              onItemClick={onItemClick}
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
          nowTop={nowLineTop}
          onItemClick={onItemClick}
          onSlotClick={(hm) => openCreate({ dateKey, startHm: hm })}
        />
      ) : null}

      <GymScheduleDetailSheet
        item={selected ? toPersonalVm(selected) : null}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onEdit={() => selected && openEdit(selected)}
        onChanged={() => {
          setSelected(null);
          router.refresh();
        }}
      />

      <GymScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
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
          setFormOpen(false);
          router.refresh();
        }}
      />

      <p className="text-xs text-matchon-text-secondary">
        시작·종료는 10분 단위입니다. 같은 선생님·같은 회원 일정은 겹칠 수
        없습니다.
        {myOnly ? " (내 일정 범위)" : null}
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href="/gym/members" className={buttonVariants({ variant: "link", size: "sm" })}>
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
    <div className="overflow-hidden rounded-xl border border-matchon-border">
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
                    role="presentation"
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] ring-1 ring-inset md:text-[11px]",
                      gymStaffColorClass(item.colorKey),
                      item.itemType === "group_class" && "font-medium",
                      item.status === "cancelled" && "opacity-50 line-through",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
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
  nowTop,
  onItemClick,
  onSlotClick,
}: {
  weekDays: string[];
  byDate: Map<string, GymCalendarItem[]>;
  todayKey: string;
  nowTop: number;
  onItemClick: (item: GymCalendarItem) => void;
  onSlotClick: (dateKey: string, hm: string) => void;
}) {
  const height = scheduleGridTotalHeightPx();
  const hours = Array.from(
    { length: SCHEDULE_GRID_END_HOUR - SCHEDULE_GRID_START_HOUR },
    (_, i) => SCHEDULE_GRID_START_HOUR + i,
  );
  return (
    <div className="overflow-auto rounded-xl border border-matchon-border">
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
        <div className="relative border-r border-matchon-border">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1 -translate-y-1/2 text-[10px] text-matchon-text-secondary"
              style={{
                top: (h - SCHEDULE_GRID_START_HOUR) * 60 * SCHEDULE_PX_PER_MINUTE,
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {weekDays.map((dk) => (
          <div
            key={dk}
            className="relative border-l border-matchon-border"
            onDoubleClick={() => onSlotClick(dk, "15:00")}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-dashed border-matchon-border/60"
                style={{
                  top: (h - SCHEDULE_GRID_START_HOUR) * 60 * SCHEDULE_PX_PER_MINUTE,
                }}
              />
            ))}
            {dk === todayKey ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500"
                style={{ top: nowTop }}
              />
            ) : null}
            {(byDate.get(dk) ?? []).map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "absolute inset-x-1 z-10 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] ring-1 ring-inset",
                  gymStaffColorClass(item.colorKey),
                  item.itemType === "group_class" && "border-l-2 border-l-primary",
                  item.status === "cancelled" && "opacity-50",
                )}
                style={{
                  top: scheduleBlockTopPx(item.startsAt),
                  height: scheduleBlockHeightPx(item.startsAt, item.endsAt),
                }}
                onClick={() => onItemClick(item)}
              >
                <div className="font-medium">{item.timeRangeLabel}</div>
                <div className="truncate">
                  {item.itemType === "group_class" ? item.title : item.memberName}
                </div>
                <div className="truncate text-[10px] opacity-80">
                  {item.itemType === "group_class"
                    ? `${item.staffName || "미정"}${
                        item.capacity != null
                          ? ` · ${item.participantCount ?? 0}/${item.capacity}`
                          : item.participantCount != null
                            ? ` · ${item.participantCount}명`
                            : ""
                      }${
                        item.waitlistCount
                          ? ` · 대기 ${item.waitlistCount}`
                          : ""
                      }`
                    : `${item.staffName} · ${item.scheduleTypeLabel}`}
                </div>
              </button>
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
  nowTop,
  onItemClick,
  onSlotClick,
}: {
  dateKey: string;
  items: GymCalendarItem[];
  nowTop: number;
  onItemClick: (item: GymCalendarItem) => void;
  onSlotClick: (hm: string) => void;
}) {
  const height = scheduleGridTotalHeightPx();
  const hours = Array.from(
    { length: SCHEDULE_GRID_END_HOUR - SCHEDULE_GRID_START_HOUR },
    (_, i) => SCHEDULE_GRID_START_HOUR + i,
  );
  const isToday = dateKey === toSeoulDateKey(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-matchon-border">
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
      <div className="relative grid grid-cols-[56px_minmax(0,1fr)]" style={{ height }}>
        <div className="relative border-r border-matchon-border">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1 -translate-y-1/2 text-[10px] text-matchon-text-secondary"
              style={{
                top: (h - SCHEDULE_GRID_START_HOUR) * 60 * SCHEDULE_PX_PER_MINUTE,
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-dashed border-matchon-border/60"
              style={{
                top: (h - SCHEDULE_GRID_START_HOUR) * 60 * SCHEDULE_PX_PER_MINUTE,
              }}
            />
          ))}
          {isToday ? (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500"
              style={{ top: nowTop }}
            />
          ) : null}
          {items.length === 0 ? (
            <p className="absolute left-3 top-3 text-sm text-matchon-text-secondary">
              등록된 일정이 없습니다.
            </p>
          ) : null}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "absolute inset-x-2 z-10 flex gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left text-xs ring-1 ring-inset",
                gymStaffColorClass(item.colorKey),
                item.itemType === "group_class" && "border-l-2 border-l-primary",
                item.status === "cancelled" && "opacity-50",
              )}
              style={{
                top: scheduleBlockTopPx(item.startsAt),
                height: Math.max(
                  48,
                  scheduleBlockHeightPx(item.startsAt, item.endsAt),
                ),
              }}
              onClick={() => onItemClick(item)}
            >
              {item.itemType === "personal" ? (
                <GymMemberAvatar
                  name={item.memberName || ""}
                  src={item.memberProfileImageUrl}
                  className="size-8"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  그룹
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium">{item.timeRangeLabel}</div>
                <div className="truncate">
                  {item.itemType === "group_class" ? item.title : item.memberName}
                </div>
                <div className="truncate opacity-80">
                  {item.itemType === "group_class"
                    ? `${item.staffName || "미정"}${
                        item.capacity != null
                          ? ` · ${item.participantCount ?? 0}/${item.capacity}`
                          : ""
                      }${
                        item.waitlistCount
                          ? ` · 대기 ${item.waitlistCount}`
                          : ""
                      } · ${item.statusLabel}`
                    : `${item.scheduleTypeLabel} · ${item.staffName} · ${item.statusLabel}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
