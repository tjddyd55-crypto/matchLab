"use client";

import { useEffect, useState, useTransition } from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import type { EventSchedulePrefill } from "@/lib/association-schedule/event-prefill";
import type { AssociationScheduleCalendarItem } from "@/lib/association-schedule/calendar";
import { TEN_MINUTE_TIME_OPTIONS } from "@/lib/gym-schedule/hours";
import {
  createAssociationScheduleAction,
  updateAssociationScheduleAction,
} from "@/features/association-schedules/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { matchonFieldInputClass, matchonFieldSelectClass } from "@/lib/ui/matchon-shell-ui";
import {
  formatSeoulScheduleTime,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";

type FormOption = { id: string; title: string; status: string };
type NoticeOption = { id: string; title: string };

export type AssociationScheduleFormPrefill = Partial<EventSchedulePrefill> & {
  relatedEventTitle?: string | null;
};

function hmFromDate(d: Date): string {
  return formatSeoulScheduleTime(d);
}

export function AssociationScheduleFormDialog({
  open,
  onOpenChange,
  defaultDateKey,
  schedule,
  prefill,
  formOptions,
  noticeOptions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDateKey: string;
  schedule: AssociationScheduleCalendarItem | null;
  prefill?: AssociationScheduleFormPrefill | null;
  formOptions: FormOption[];
  noticeOptions: NoticeOption[];
  onSaved: (result: { scheduleId: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("EDUCATION");
  const [startsAtDate, setStartsAtDate] = useState(defaultDateKey);
  const [startsAtHm, setStartsAtHm] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [relatedUrl, setRelatedUrl] = useState("");
  const [relatedFormId, setRelatedFormId] = useState("");
  const [relatedNoticeId, setRelatedNoticeId] = useState("");
  const [relatedEventId, setRelatedEventId] = useState("");
  const [relatedEventTitle, setRelatedEventTitle] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    scheduleEffectStateUpdate(() => {
      setMessage(null);
      if (schedule) {
        setTitle(schedule.title);
        setType(schedule.type);
        setStartsAtDate(toSeoulDateKey(schedule.startsAt).slice(0, 10));
        setStartsAtHm(schedule.allDay ? "" : hmFromDate(schedule.startsAt));
        setAllDay(schedule.allDay);
        setLocation(schedule.location ?? "");
        setDescription("");
        setVisibility(schedule.visibility);
        setRelatedUrl(schedule.relatedUrl ?? "");
        setRelatedFormId(schedule.relatedForm?.id ?? "");
        setRelatedNoticeId(schedule.relatedNotice?.id ?? "");
        setRelatedEventId(schedule.relatedEvent?.id ?? "");
        setRelatedEventTitle(schedule.relatedEvent?.title ?? null);
      } else if (prefill) {
        setTitle(prefill.title ?? "");
        setType(prefill.type ?? "EDUCATION");
        setStartsAtDate(prefill.startsAtDate ?? defaultDateKey);
        setStartsAtHm(prefill.startsAtHm ?? "");
        setAllDay(prefill.allDay ?? !prefill.startsAtHm);
        setLocation(prefill.location ?? "");
        setDescription(prefill.description ?? "");
        setVisibility("PRIVATE");
        setRelatedUrl("");
        setRelatedFormId("");
        setRelatedNoticeId("");
        setRelatedEventId(prefill.relatedEventId ?? "");
        setRelatedEventTitle(prefill.relatedEventTitle ?? prefill.title ?? null);
      } else {
        setTitle("");
        setType("EDUCATION");
        setStartsAtDate(defaultDateKey);
        setStartsAtHm("");
        setAllDay(false);
        setLocation("");
        setDescription("");
        setVisibility("PRIVATE");
        setRelatedUrl("");
        setRelatedFormId("");
        setRelatedNoticeId("");
        setRelatedEventId("");
        setRelatedEventTitle(null);
      }
    });
  }, [open, schedule, prefill, defaultDateKey]);

  function save() {
    const payload = {
      title,
      type,
      startsAtDate,
      startsAtHm: allDay ? null : startsAtHm || null,
      allDay,
      location: location || null,
      description: description || null,
      visibility,
      relatedUrl: relatedUrl || null,
      relatedFormId: relatedFormId || null,
      relatedNoticeId: relatedNoticeId || null,
      relatedEventId: relatedEventId || null,
    };
    startTransition(async () => {
      const result = schedule
        ? await updateAssociationScheduleAction(schedule.id, payload)
        : await createAssociationScheduleAction(payload);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      onOpenChange(false);
      onSaved({ scheduleId: result.data.scheduleId });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule ? "일정 수정" : "일정 추가"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {message ? (
            <p className="text-destructive text-sm">{message}</p>
          ) : null}
          {relatedEventTitle ? (
            <div className="rounded-md border border-matchon-border bg-matchon-surface/60 px-3 py-2 text-sm">
              <span className="text-matchon-text-secondary">관련 대회</span>
              <p className="mt-1 font-semibold text-matchon-text-primary">
                {relatedEventTitle}
              </p>
            </div>
          ) : null}
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={matchonFieldInputClass}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">유형</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={matchonFieldSelectClass}
            >
              <option value="TOURNAMENT">대회</option>
              <option value="EDUCATION">교육</option>
              <option value="MEETING">회의</option>
              <option value="EVENT">행사</option>
              <option value="EXAM">심사</option>
              <option value="OTHER">기타</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            종일
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">시작일 *</span>
              <input
                type="date"
                value={startsAtDate}
                onChange={(e) => setStartsAtDate(e.target.value)}
                className={matchonFieldInputClass}
                required
              />
            </label>
            {!allDay ? (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">시작시간</span>
                <select
                  value={startsAtHm}
                  onChange={(e) => setStartsAtHm(e.target.value)}
                  className={matchonFieldSelectClass}
                >
                  <option value="">선택 안 함</option>
                  {TEN_MINUTE_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">장소</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={matchonFieldInputClass}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={matchonFieldInputClass}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">공개범위</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className={matchonFieldSelectClass}
            >
              <option value="PRIVATE">협회 내부</option>
              <option value="MEMBER_GYMS">회원사 공개</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">관련 신청 폼</span>
            <select
              value={relatedFormId}
              onChange={(e) => setRelatedFormId(e.target.value)}
              className={matchonFieldSelectClass}
            >
              <option value="">없음</option>
              {formOptions.map((f) => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">관련 공지</span>
            <select
              value={relatedNoticeId}
              onChange={(e) => setRelatedNoticeId(e.target.value)}
              className={matchonFieldSelectClass}
            >
              <option value="">없음</option>
              {noticeOptions.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">외부 링크</span>
            <input
              value={relatedUrl}
              onChange={(e) => setRelatedUrl(e.target.value)}
              className={matchonFieldInputClass}
            />
          </label>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
