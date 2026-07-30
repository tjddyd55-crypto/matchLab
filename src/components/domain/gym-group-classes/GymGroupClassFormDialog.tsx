"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  createGymGroupClassAction,
  updateGymGroupClassAction,
} from "@/features/gym-group-classes/actions";
import {
  GYM_GROUP_CLASS_VISIBILITY_OPTIONS,
} from "@/lib/gym-group-class/labels";
import { GYM_STAFF_COLOR_KEYS } from "@/lib/gym-schedule/labels";
import { TEN_MINUTE_TIME_OPTIONS } from "@/lib/gym-schedule/hours";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import type { GymGroupClassVisibility } from "@/lib/enums";
import type { ScheduleStaffOption } from "@/components/domain/gym-schedules/GymScheduleCalendarApp";

function addHour(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const next = Math.min(23 * 60 + 50, h * 60 + m + 60);
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

export type GymGroupClassFormExisting = {
  id: string;
  title: string;
  description: string | null;
  instructorStaffId: string | null;
  dateKey: string;
  timeRangeLabel: string;
  capacity: number | null;
  location: string | null;
  visibility: GymGroupClassVisibility;
  colorKey: string | null;
};

type FormDefaults = {
  dateKey: string;
  startHm: string;
  instructorStaffId: string;
};

export function GymGroupClassFormDialog({
  open,
  onOpenChange,
  staffOptions,
  fixedStaffId,
  defaults,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffOptions: ScheduleStaffOption[];
  fixedStaffId: string | null;
  defaults: FormDefaults | null;
  existing: GymGroupClassFormExisting | null;
  onSaved: () => void;
}) {
  const formKey = open && defaults
    ? `${existing?.id ?? "new"}:${defaults.dateKey}:${defaults.startHm}:${defaults.instructorStaffId}`
    : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existing ? "그룹수업 수정" : "그룹수업 등록"}
          </DialogTitle>
          <DialogDescription>
            시작·종료는 10분 단위로 선택합니다. 기본 종료는 시작 1시간 뒤입니다.
          </DialogDescription>
        </DialogHeader>
        {defaults ? (
          <GymGroupClassFormBody
            key={formKey}
            staffOptions={staffOptions}
            fixedStaffId={fixedStaffId}
            defaults={defaults}
            existing={existing}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GymGroupClassFormBody({
  staffOptions,
  fixedStaffId,
  defaults,
  existing,
  onOpenChange,
  onSaved,
}: {
  staffOptions: ScheduleStaffOption[];
  fixedStaffId: string | null;
  defaults: FormDefaults;
  existing: GymGroupClassFormExisting | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const initialStart = existing
    ? existing.timeRangeLabel.slice(0, 5)
    : defaults.startHm;
  const initialEnd = existing
    ? existing.timeRangeLabel.slice(6, 11)
    : addHour(initialStart);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [instructorStaffId, setInstructorStaffId] = useState(
    fixedStaffId || existing?.instructorStaffId || defaults.instructorStaffId || "",
  );
  const [dateKey, setDateKey] = useState(existing?.dateKey ?? defaults.dateKey);
  const [startHm, setStartHm] = useState(initialStart);
  const [endHm, setEndHm] = useState(initialEnd);
  const [capacity, setCapacity] = useState(
    existing?.capacity != null ? String(existing.capacity) : "",
  );
  const [location, setLocation] = useState(existing?.location ?? "");
  const [visibility, setVisibility] = useState<GymGroupClassVisibility>(
    existing?.visibility ?? "members_only",
  );
  const [colorKey, setColorKey] = useState(existing?.colorKey ?? "");

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("instructorStaffId", instructorStaffId);
    fd.set("dateKey", dateKey);
    fd.set("startHm", startHm);
    fd.set("endHm", endHm);
    fd.set("capacity", capacity);
    fd.set("location", location);
    fd.set("visibility", visibility);
    fd.set("colorKey", colorKey);

    startTransition(async () => {
      const result = existing?.id
        ? await updateGymGroupClassAction(existing.id, fd)
        : await createGymGroupClassAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onSaved();
    });
  }

  return (
    <>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span>수업명 *</span>
          <input
            className={matchonFieldInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>설명</span>
          <textarea
            className={matchonFieldInputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>담당 선생님</span>
          <select
            className={matchonFieldInputClass}
            value={instructorStaffId}
            disabled={Boolean(fixedStaffId)}
            onChange={(e) => setInstructorStaffId(e.target.value)}
          >
            <option value="">담당 선생님 미정</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.title ? ` · ${s.title}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block space-y-1 text-sm sm:col-span-1">
            <span>날짜 *</span>
            <input
              type="date"
              className={matchonFieldInputClass}
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>시작 *</span>
            <select
              className={matchonFieldInputClass}
              value={startHm}
              onChange={(e) => {
                setStartHm(e.target.value);
                setEndHm(addHour(e.target.value));
              }}
            >
              {TEN_MINUTE_TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>종료 *</span>
            <select
              className={matchonFieldInputClass}
              value={endHm}
              onChange={(e) => setEndHm(e.target.value)}
            >
              {TEN_MINUTE_TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span>정원 (비우면 무제한)</span>
          <input
            type="number"
            min={1}
            max={999}
            className={matchonFieldInputClass}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="무제한"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>장소</span>
          <input
            className={matchonFieldInputClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>공개 범위</span>
          <select
            className={matchonFieldInputClass}
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as GymGroupClassVisibility)
            }
          >
            {GYM_GROUP_CLASS_VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span>색상 (선택)</span>
          <select
            className={matchonFieldInputClass}
            value={colorKey}
            onChange={(e) => setColorKey(e.target.value)}
          >
            <option value="">기본</option>
            {GYM_STAFF_COLOR_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          닫기
        </Button>
        <Button
          type="button"
          disabled={pending || !title.trim()}
          onClick={submit}
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
      </DialogFooter>
    </>
  );
}
