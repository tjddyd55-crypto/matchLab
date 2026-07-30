"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GymGroupClassFormDialog } from "@/components/domain/gym-group-classes/GymGroupClassFormDialog";
import { Button } from "@/components/ui/button";
import { GYM_GROUP_CLASS_STATUS_OPTIONS } from "@/lib/gym-group-class/labels";
import { gymStaffColorClass } from "@/lib/gym-schedule/labels";
import {
  createSeoulDateTime,
  getSeoulScheduleWeekRange,
  getSeoulYmdParts,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import type { GymGroupClassVM } from "@/lib/services/gym-group-class.service";
import type { ScheduleStaffOption } from "@/components/domain/gym-schedules/GymScheduleCalendarApp";
import { cn } from "@/lib/utils";

export type SerializableGymGroupClassVM = Omit<
  GymGroupClassVM,
  "startsAt" | "endsAt"
>;

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

function sortClasses(items: SerializableGymGroupClassVM[]) {
  return [...items].sort((a, b) => {
    const keyA = `${a.dateKey}T${a.timeRangeLabel.slice(0, 5)}`;
    const keyB = `${b.dateKey}T${b.timeRangeLabel.slice(0, 5)}`;
    return keyA.localeCompare(keyB);
  });
}

function capacityLabel(c: SerializableGymGroupClassVM): string {
  if (c.capacity == null) {
    return `${c.attendingCount}명 참석`;
  }
  return `${c.attendingCount}/${c.capacity}명`;
}

export function GymGroupClassListApp({
  initialClasses,
  staffOptions,
  viewer,
  fixedStaffId,
  defaultStaffId,
}: {
  initialClasses: SerializableGymGroupClassVM[];
  staffOptions: ScheduleStaffOption[];
  viewer: "owner" | "staff";
  fixedStaffId: string | null;
  defaultStaffId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const view = (searchParams.get("view") as ViewMode) || (viewer === "staff" ? "day" : "week");
  const dateKey =
    searchParams.get("date") || toSeoulDateKey(new Date());
  const staffFilter = searchParams.get("staffId") || "";
  const statusFilter = searchParams.get("status") || "active";
  const titleQuery = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(titleQuery);

  const [formOpen, setFormOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<{
    dateKey: string;
    startHm: string;
    instructorStaffId: string;
  } | null>(null);

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

  const classes = useMemo(() => {
    return initialClasses.filter((c) => {
      if (staffFilter && c.instructorStaffId !== staffFilter) return false;
      if (statusFilter === "active" && c.status === "cancelled") return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "active" &&
        c.status !== statusFilter
      ) {
        return false;
      }
      if (titleQuery.trim()) {
        const q = titleQuery.trim().toLowerCase();
        if (!c.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [initialClasses, staffFilter, statusFilter, titleQuery]);

  const weekDays = useMemo(() => {
    const w = getSeoulScheduleWeekRange(createSeoulDateTime(dateKey, "12:00"));
    return Array.from({ length: 7 }, (_, i) => shiftDateKey(w.startKey, i));
  }, [dateKey]);

  const visibleDateKeys = useMemo(() => {
    if (view === "day") return [dateKey];
    if (view === "week") return weekDays;
    const { year, month } = getSeoulYmdParts(createSeoulDateTime(dateKey, "12:00"));
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    const keys = new Set(classes.filter((c) => c.dateKey.startsWith(prefix)).map((c) => c.dateKey));
    return sortClasses(classes.filter((c) => keys.has(c.dateKey))).reduce<string[]>((acc, c) => {
      if (!acc.includes(c.dateKey)) acc.push(c.dateKey);
      return acc;
    }, []);
  }, [view, dateKey, weekDays, classes]);

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

  function openCreate(opts?: { dateKey?: string; startHm?: string }) {
    setFormDefaults({
      dateKey: opts?.dateKey || dateKey,
      startHm: opts?.startHm || "15:00",
      instructorStaffId: fixedStaffId || defaultStaffId || "",
    });
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
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
            onChange={(e) => pushQuery({ staffId: e.target.value || null })}
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
          value={statusFilter}
          onChange={(e) => pushQuery({ status: e.target.value })}
        >
          <option value="active">취소 제외</option>
          <option value="all">전체 상태</option>
          {GYM_GROUP_CLASS_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <input
            className={cn(matchonFieldInputClass, "w-36")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                pushQuery({ q: searchInput.trim() || null });
              }
            }}
            placeholder="수업명 검색"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => pushQuery({ q: searchInput.trim() || null })}
          >
            검색
          </Button>
        </div>
        <Button type="button" size="sm" onClick={() => openCreate()}>
          수업 등록
        </Button>
      </div>

      {classes.length === 0 ? (
        <p className="rounded-xl border border-matchon-border bg-matchon-surface/30 px-4 py-8 text-center text-sm text-matchon-text-secondary">
          표시할 그룹수업이 없습니다.
        </p>
      ) : (
        <div className="space-y-6">
          {visibleDateKeys.map((dk) => {
            const dayItems = sortClasses(classes.filter((c) => c.dateKey === dk));
            if (dayItems.length === 0) return null;
            const weekday = WEEKDAY_LABELS[
              (new Date(`${dk}T12:00:00+09:00`).getDay() + 6) % 7
            ];
            return (
              <section key={dk} className="space-y-2">
                <h2 className="text-sm font-semibold text-matchon-text-secondary">
                  {dk} ({weekday})
                </h2>
                <ul className="space-y-2">
                  {dayItems.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/gym/group-classes/${c.id}`}
                        className={cn(
                          "block rounded-xl border border-matchon-border bg-white p-3 transition-colors hover:bg-matchon-surface/40",
                          c.status === "cancelled" && "opacity-60",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-medium">{c.title}</p>
                            <p className="text-sm text-matchon-text-secondary">
                              {c.timeRangeLabel}
                              {c.instructorName
                                ? ` · ${c.instructorName}`
                                : " · 담당 미정"}
                            </p>
                            <p className="text-xs text-matchon-text-secondary">
                              {capacityLabel(c)}
                              {c.waitlistCount > 0
                                ? ` · 대기 ${c.waitlistCount}명`
                                : ""}
                              {c.location ? ` · ${c.location}` : ""}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset",
                              gymStaffColorClass(c.colorKey),
                              c.capacityExceeded &&
                                "bg-rose-100 text-rose-900 ring-rose-200",
                            )}
                          >
                            {c.statusLabel}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <GymGroupClassFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        staffOptions={staffOptions}
        fixedStaffId={fixedStaffId}
        defaults={formDefaults}
        existing={null}
        onSaved={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />

      <p className="text-xs text-matchon-text-secondary">
        시작·종료는 10분 단위입니다. 같은 선생님의 그룹수업·개인 일정은 겹칠 수
        없습니다.
      </p>
    </div>
  );
}
