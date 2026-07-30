"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import {
  createGymScheduleAction,
  updateGymScheduleAction,
} from "@/features/gym-schedules/actions";
import { GYM_PERSONAL_SCHEDULE_TYPE_OPTIONS } from "@/lib/gym-schedule/labels";
import { TEN_MINUTE_TIME_OPTIONS } from "@/lib/gym-schedule/hours";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import type { GymScheduleVM } from "@/lib/services/gym-schedule.service";
import type {
  ScheduleMemberOption,
  ScheduleStaffOption,
} from "@/components/domain/gym-schedules/GymScheduleCalendarApp";

function addHour(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const next = Math.min(23 * 60 + 50, h * 60 + m + 60);
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

type FormDefaults = {
  dateKey: string;
  startHm: string;
  staffId: string;
  memberId?: string;
  scheduleId?: string;
};

export function GymScheduleFormDialog({
  open,
  onOpenChange,
  staffOptions,
  memberOptions,
  fixedStaffId,
  defaults,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffOptions: ScheduleStaffOption[];
  memberOptions: ScheduleMemberOption[];
  fixedStaffId: string | null;
  defaults: FormDefaults | null;
  existing: GymScheduleVM | null;
  onSaved: () => void;
}) {
  const formKey = open && defaults
    ? `${existing?.id ?? "new"}:${defaults.dateKey}:${defaults.startHm}:${defaults.staffId}:${defaults.memberId ?? ""}`
    : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existing ? "개인 일정 수정" : "개인 일정 등록"}
          </DialogTitle>
          <DialogDescription>
            시작·종료는 10분 단위로 선택합니다. 기본 종료는 시작 1시간 뒤입니다.
          </DialogDescription>
        </DialogHeader>
        {defaults ? (
          <GymScheduleFormBody
            key={formKey}
            staffOptions={staffOptions}
            memberOptions={memberOptions}
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

function GymScheduleFormBody({
  staffOptions,
  memberOptions,
  fixedStaffId,
  defaults,
  existing,
  onOpenChange,
  onSaved,
}: {
  staffOptions: ScheduleStaffOption[];
  memberOptions: ScheduleMemberOption[];
  fixedStaffId: string | null;
  defaults: FormDefaults;
  existing: GymScheduleVM | null;
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
  const [hint, setHint] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [gymStaffId, setGymStaffId] = useState(
    fixedStaffId || defaults.staffId,
  );
  const [gymMemberId, setGymMemberId] = useState(
    defaults.memberId || existing?.gymMemberId || "",
  );
  const [dateKey, setDateKey] = useState(defaults.dateKey);
  const [startHm, setStartHm] = useState(initialStart);
  const [endHm, setEndHm] = useState(initialEnd);
  const [scheduleType, setScheduleType] = useState<string>(
    existing?.scheduleType || "personal_training",
  );
  const [title, setTitle] = useState(existing?.title || "");
  const [location, setLocation] = useState(existing?.location || "");
  const [memo, setMemo] = useState(existing?.memo || "");

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return memberOptions.slice(0, 40);
    return memberOptions.filter((m) => {
      const phoneTail = m.phoneMasked.replace(/\D/g, "").slice(-4);
      return (
        m.name.toLowerCase().includes(q) ||
        m.memberNumber.toLowerCase().includes(q) ||
        phoneTail.includes(q.replace(/\D/g, ""))
      );
    });
  }, [memberOptions, memberQuery]);

  const selectedMember = memberOptions.find((m) => m.id === gymMemberId);

  function submit() {
    setError(null);
    setHint(null);
    const fd = new FormData();
    fd.set("gymStaffId", gymStaffId);
    fd.set("gymMemberId", gymMemberId);
    fd.set("dateKey", dateKey);
    fd.set("startHm", startHm);
    fd.set("endHm", endHm);
    fd.set("scheduleType", scheduleType);
    fd.set("title", title);
    fd.set("location", location);
    fd.set("memo", memo);

    startTransition(async () => {
      const result = existing?.id
        ? await updateGymScheduleAction(existing.id, fd)
        : await createGymScheduleAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (
        !existing &&
        "notAssignedHint" in result.data &&
        result.data.notAssignedHint
      ) {
        setHint(
          "현재 담당 회원으로 지정되지 않은 회원입니다. 일정은 등록되었으며 담당 지정은 관장이 변경할 수 있습니다.",
        );
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
      {hint ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {hint}
        </p>
      ) : null}

      <div className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span>선생님 *</span>
          <select
            className={matchonFieldInputClass}
            value={gymStaffId}
            disabled={Boolean(fixedStaffId)}
            onChange={(e) => setGymStaffId(e.target.value)}
          >
            <option value="">선택</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.title ? ` · ${s.title}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span>회원 검색</span>
            <input
              className={matchonFieldInputClass}
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="이름 또는 전화번호 끝 4자리"
            />
          </label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-matchon-border p-2">
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  gymMemberId === m.id ? "bg-primary/10" : "hover:bg-muted/60"
                }`}
                onClick={() => {
                  setGymMemberId(m.id);
                  if (!title.trim()) {
                    setTitle(`${m.name} 개인 PT`);
                  }
                }}
              >
                <GymMemberAvatar
                  name={m.name}
                  src={m.profileImageUrl}
                  className="size-8"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate text-xs text-matchon-text-secondary">
                    {m.phoneMasked}
                    {m.primaryStaffName
                      ? ` · 담당 ${m.primaryStaffName}`
                      : ""}
                    {m.planLabel ? ` · ${m.planLabel}` : ""}
                    {m.status !== "active" ? ` · ${m.status}` : ""}
                  </span>
                </span>
              </button>
            ))}
            {filteredMembers.length === 0 ? (
              <p className="px-2 py-3 text-xs text-matchon-text-secondary">
                검색 결과가 없습니다.
              </p>
            ) : null}
          </div>
          {selectedMember &&
          (selectedMember.status !== "active" ||
            selectedMember.planLabel?.includes("만료")) ? (
            <p className="text-xs text-amber-800">
              이용권 만료 또는 비활성 회원입니다. 예약은 등록할 수 있지만 확인이
              필요합니다.
            </p>
          ) : null}
        </div>

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
          <span>일정 유형</span>
          <select
            className={matchonFieldInputClass}
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value)}
          >
            {GYM_PERSONAL_SCHEDULE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span>제목</span>
          <input
            className={matchonFieldInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
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
          <span>메모</span>
          <textarea
            className={matchonFieldInputClass}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            maxLength={2000}
          />
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
          disabled={pending || !gymStaffId || !gymMemberId}
          onClick={submit}
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
      </DialogFooter>
    </>
  );
}
