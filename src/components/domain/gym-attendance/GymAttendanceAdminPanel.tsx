"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  cancelGymAttendanceAction,
  createManualGymAttendanceAction,
} from "@/features/gym-attendance/actions";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  formatSeoulDateTime,
  toSeoulDateOnlyString,
} from "@/lib/gym-attendance/seoul-date";
import { cn } from "@/lib/utils";

type AttendanceRow = {
  id: string;
  attendedAt: Date | string;
  attendanceDate: Date | string;
  source: string;
  note: string | null;
  membershipStatusSnapshot: string | null;
  memberId: string;
  memberName: string;
  /** 서버에서 발급한 signed read URL (private 버킷) */
  memberProfileImageUrl: string | null;
  maskedPhone: string;
  memberStatus: string;
  planName: string | null;
};

type MemberOption = { id: string; name: string; memberNumber: string };

function sourceLabel(source: string): string {
  if (source === "kiosk") return "키오스크";
  if (source === "admin_manual") return "수동";
  return source;
}

export function GymAttendanceAdminPanel({
  summary,
  rows,
  total,
  members,
  filters,
}: {
  summary: {
    todayCount: number;
    weekCount: number;
    monthCount: number;
    deskNoticeCount: number;
    todayDate: string;
  };
  rows: AttendanceRow[];
  total: number;
  members: MemberOption[];
  filters: {
    dateFrom?: string;
    dateTo?: string;
    memberNameQ?: string;
    phoneTail?: string;
    source?: string;
  };
}) {
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [memberQ, setMemberQ] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [note, setNote] = useState("");

  const filteredMembers = useMemo(() => {
    const q = memberQ.trim().toLowerCase();
    if (!q) return members.slice(0, 20);
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.memberNumber.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [memberQ, members]);

  function submitManual() {
    if (!selectedMemberId) {
      setError("회원을 선택해 주세요.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("gymMemberId", selectedMemberId);
    if (note.trim()) fd.set("note", note.trim());
    startTransition(async () => {
      const result = await createManualGymAttendanceAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      window.location.reload();
    });
  }

  async function cancelRow(row: AttendanceRow) {
    const dateLabel = toSeoulDateOnlyString(new Date(row.attendanceDate));
    const ok = await confirm({
      title: "출석 기록을 취소할까요?",
      description: `${row.memberName} 회원의 ${dateLabel} 출석 기록이 취소됩니다.`,
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    const fd = new FormData();
    fd.set("attendanceId", row.id);
    fd.set("memberId", row.memberId);
    startTransition(async () => {
      const result = await cancelGymAttendanceAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="오늘 출석" value={summary.todayCount} />
        <Stat label="이번 주" value={summary.weekCount} />
        <Stat label="이번 달" value={summary.monthCount} />
        <Stat label="이용권 확인 필요" value={summary.deskNoticeCount} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setShowManual((v) => !v)}>
          수동 출석 등록
        </Button>
        <Link
          href="/gym/attendance/kiosks"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          출석 키오스크
        </Link>
      </div>

      {showManual ? (
        <section className="rounded-xl border border-matchon-border bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">수동 출석 등록</h2>
          <input
            value={memberQ}
            onChange={(e) => setMemberQ(e.target.value)}
            placeholder="회원명·번호 검색"
            className="mb-2 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
          <ul className="mb-3 max-h-40 overflow-y-auto rounded-md border border-matchon-border">
            {filteredMembers.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                    selectedMemberId === m.id
                      ? "bg-matchon-primary/10"
                      : "hover:bg-slate-50",
                  )}
                >
                  <span>{m.name}</span>
                  <span className="font-mono text-xs text-matchon-text-secondary">
                    {m.memberNumber}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (선택)"
            rows={2}
            className="mb-3 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
          <Button type="button" disabled={pending} onClick={submitManual}>
            저장
          </Button>
        </section>
      ) : null}

      <form
        method="get"
        className="grid gap-2 rounded-xl border border-matchon-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="text-xs">
          시작일
          <input
            name="dateFrom"
            type="date"
            defaultValue={filters.dateFrom ?? summary.todayDate}
            className="mt-1 w-full rounded-md border border-matchon-border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          종료일
          <input
            name="dateTo"
            type="date"
            defaultValue={filters.dateTo ?? summary.todayDate}
            className="mt-1 w-full rounded-md border border-matchon-border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          회원명
          <input
            name="memberNameQ"
            defaultValue={filters.memberNameQ ?? ""}
            className="mt-1 w-full rounded-md border border-matchon-border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          휴대폰 끝 4자리
          <input
            name="phoneTail"
            inputMode="numeric"
            maxLength={4}
            defaultValue={filters.phoneTail ?? ""}
            className="mt-1 w-full rounded-md border border-matchon-border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          출석 방식
          <select
            name="source"
            defaultValue={filters.source ?? ""}
            className="mt-1 w-full rounded-md border border-matchon-border px-2 py-1.5 text-sm"
          >
            <option value="">전체</option>
            <option value="kiosk">키오스크</option>
            <option value="admin_manual">수동</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" className="w-full">
            검색
          </Button>
          <Link
            href="/gym/attendance"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full justify-center",
            )}
          >
            초기화
          </Link>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-matchon-text-secondary">총 {total}건</p>

      <ul className="divide-y divide-matchon-border rounded-xl border border-matchon-border bg-white">
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-matchon-text-secondary">
            출석 기록이 없습니다.
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <GymMemberAvatar
                  src={row.memberProfileImageUrl}
                  name={row.memberName}
                  className="size-9"
                />
                <div className="min-w-0">
                  <p className="font-medium text-matchon-text-primary">
                    {row.memberName}{" "}
                    <span className="text-xs font-normal text-matchon-text-secondary">
                      {row.maskedPhone}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-matchon-text-secondary">
                    {formatSeoulDateTime(new Date(row.attendedAt))} ·{" "}
                    {sourceLabel(row.source)}
                    {row.membershipStatusSnapshot
                      ? ` · ${row.membershipStatusSnapshot}`
                      : ""}
                    {row.planName ? ` · ${row.planName}` : ""}
                  </p>
                  {row.note ? (
                    <p className="mt-1 text-xs text-matchon-text-secondary">
                      {row.note}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/gym/members/${row.memberId}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  상세
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void cancelRow(row)}
                >
                  출석 취소
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-matchon-border bg-white p-3">
      <p className="text-xs text-matchon-text-secondary">{label}</p>
      <p className="mt-1 text-xl font-bold text-matchon-text-primary">{value}</p>
    </div>
  );
}
