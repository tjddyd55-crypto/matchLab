"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import {
  GymGroupClassFormDialog,
  type GymGroupClassFormExisting,
} from "@/components/domain/gym-group-classes/GymGroupClassFormDialog";
import type { SerializableGymGroupClassVM } from "@/components/domain/gym-group-classes/GymGroupClassListApp";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  addGymGroupClassParticipantAction,
  cancelGymGroupClassAction,
  cancelGymGroupClassParticipantAction,
  completeGymGroupClassAction,
  moveGymGroupClassParticipantToWaitlistAction,
  promoteGymGroupClassParticipantAction,
} from "@/features/gym-group-classes/actions";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { matchonSectionTitleClass } from "@/lib/ui/matchon-layout";
import type { GymGroupClassParticipantVM } from "@/lib/services/gym-group-class.service";
import type { ScheduleMemberOption, ScheduleStaffOption } from "@/components/domain/gym-schedules/GymScheduleCalendarApp";
import { cn } from "@/lib/utils";

export type SerializableGymGroupClassParticipantVM = Omit<
  GymGroupClassParticipantVM,
  "respondedAt" | "cancelledAt"
> & {
  respondedAt: string;
  cancelledAt: string | null;
};

type ParticipantTab = "attending" | "waitlisted" | "cancelled" | "all";

const TAB_LABELS: Record<ParticipantTab, string> = {
  attending: "참석",
  waitlisted: "대기",
  cancelled: "취소",
  all: "전체",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function capacityLabel(c: SerializableGymGroupClassVM): string {
  if (c.capacity == null) {
    return `${c.attendingCount}명 참석`;
  }
  return `${c.attendingCount}/${c.capacity}명`;
}

export function GymGroupClassDetailApp({
  gymClass,
  participants,
  canManage,
  staffOptions,
  memberOptions,
  fixedStaffId,
}: {
  gymClass: SerializableGymGroupClassVM;
  participants: SerializableGymGroupClassParticipantVM[];
  canManage: boolean;
  staffOptions: ScheduleStaffOption[];
  memberOptions: ScheduleMemberOption[];
  fixedStaffId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [promoteBanner, setPromoteBanner] = useState<string | null>(null);
  const [tab, setTab] = useState<ParticipantTab>("attending");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<null | "complete" | "cancel">(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const filteredParticipants = useMemo(() => {
    if (tab === "all") return participants;
    if (tab === "cancelled") {
      return participants.filter(
        (p) => p.status === "cancelled" || p.status === "not_attending",
      );
    }
    return participants.filter((p) => p.status === tab);
  }, [participants, tab]);

  const filteredMembers = useMemo(() => {
    const enrolled = new Set(
      participants
        .filter((p) => p.status === "attending" || p.status === "waitlisted")
        .map((p) => p.gymMemberId),
    );
    const q = memberQuery.trim().toLowerCase();
    return memberOptions
      .filter((m) => !enrolled.has(m.id))
      .filter((m) => {
        if (!q) return true;
        const phoneTail = m.phoneMasked.replace(/\D/g, "").slice(-4);
        return (
          m.name.toLowerCase().includes(q) ||
          m.memberNumber.toLowerCase().includes(q) ||
          phoneTail.includes(q.replace(/\D/g, ""))
        );
      })
      .slice(0, 40);
  }, [memberOptions, memberQuery, participants]);

  const existingForm: GymGroupClassFormExisting = {
    id: gymClass.id,
    title: gymClass.title,
    description: gymClass.description,
    instructorStaffId: gymClass.instructorStaffId,
    dateKey: gymClass.dateKey,
    timeRangeLabel: gymClass.timeRangeLabel,
    capacity: gymClass.capacity,
    location: gymClass.location,
    visibility: gymClass.visibility,
    colorKey: gymClass.colorKey,
  };

  function refresh() {
    router.refresh();
  }

  function runClassAction() {
    if (!confirmMode) return;
    setError(null);
    startTransition(async () => {
      let result;
      if (confirmMode === "complete") {
        result = await completeGymGroupClassAction(gymClass.id);
      } else {
        const fd = new FormData();
        fd.set("reason", cancelReason);
        result = await cancelGymGroupClassAction(gymClass.id, fd);
      }
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setConfirmMode(null);
      refresh();
    });
  }

  function addParticipant() {
    if (!selectedMemberId) return;
    setError(null);
    const fd = new FormData();
    fd.set("gymMemberId", selectedMemberId);
    startTransition(async () => {
      const result = await addGymGroupClassParticipantAction(gymClass.id, fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setAddOpen(false);
      setSelectedMemberId("");
      setMemberQuery("");
      refresh();
    });
  }

  function runParticipantAction(
    action: "cancel" | "promote" | "waitlist",
    gymMemberId: string,
  ) {
    setError(null);
    setPromoteBanner(null);
    startTransition(async () => {
      if (action === "cancel") {
        const result = await cancelGymGroupClassParticipantAction(
          gymClass.id,
          gymMemberId,
        );
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        if (result.data.promotedMemberId) {
          const promoted = participants.find(
            (p) => p.gymMemberId === result.data.promotedMemberId,
          );
          setPromoteBanner(
            promoted
              ? `${promoted.memberName} 회원이 대기에서 자동 승급되었습니다.`
              : "대기 회원이 자동 승급되었습니다.",
          );
        }
        refresh();
        return;
      }

      const result =
        action === "promote"
          ? await promoteGymGroupClassParticipantAction(
              gymClass.id,
              gymMemberId,
            )
          : await moveGymGroupClassParticipantToWaitlistAction(
              gymClass.id,
              gymMemberId,
            );
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-matchon-border bg-white p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold">{gymClass.title}</h1>
            <p className="text-sm text-matchon-text-secondary">
              {gymClass.dateKey} · {gymClass.timeRangeLabel}
            </p>
          </div>
          <span className="rounded-full bg-matchon-surface px-2 py-0.5 text-xs font-medium">
            {gymClass.statusLabel}
          </span>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <InfoItem
            label="담당 선생님"
            value={gymClass.instructorName ?? "담당 미정"}
          />
          <InfoItem label="정원" value={capacityLabel(gymClass)} />
          {gymClass.waitlistCount > 0 ? (
            <InfoItem label="대기" value={`${gymClass.waitlistCount}명`} />
          ) : null}
          <InfoItem label="장소" value={gymClass.location ?? "—"} />
          <InfoItem label="공개 범위" value={gymClass.visibilityLabel} />
        </dl>

        {gymClass.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-matchon-text-secondary">
            {gymClass.description}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {promoteBanner ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {promoteBanner}
          </p>
        ) : null}

        {canManage && gymClass.status === "scheduled" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              수정
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmMode("complete")}
            >
              완료
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmMode("cancel")}
            >
              수업 취소
            </Button>
          </div>
        ) : null}

        {confirmMode ? (
          <div className="mt-4 space-y-2 rounded-lg border border-matchon-border p-3">
            <p className="text-sm font-medium">
              {confirmMode === "complete"
                ? "이 수업을 완료 처리할까요?"
                : "이 수업을 취소할까요?"}
            </p>
            {confirmMode === "cancel" ? (
              <textarea
                className={matchonFieldInputClass}
                placeholder="취소 사유 (선택)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
              />
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setConfirmMode(null)}
              >
                돌아가기
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={runClassAction}
              >
                확인
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-matchon-border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className={matchonSectionTitleClass}>참석자</h2>
          {canManage && gymClass.status === "scheduled" ? (
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              회원 추가
            </Button>
          ) : null}
        </div>

        <div className="mb-3 flex flex-wrap gap-1">
          {(Object.keys(TAB_LABELS) as ParticipantTab[]).map((key) => (
            <button
              key={key}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-matchon-text-secondary hover:bg-muted/60",
              )}
              onClick={() => setTab(key)}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>

        {filteredParticipants.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">
            표시할 참석자가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-matchon-border">
            {filteredParticipants.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 py-3 text-sm"
              >
                <GymMemberAvatar
                  name={p.memberName}
                  src={p.profileImageUrl}
                  className="size-10"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.memberName}</p>
                  <p className="text-xs text-matchon-text-secondary">
                    {p.phoneMasked} · {p.memberStatus} · {p.statusLabel}
                    {p.displayWaitlistOrder != null
                      ? ` · 대기 ${p.displayWaitlistOrder}번`
                      : ""}
                    · {formatDateTime(p.respondedAt)}
                  </p>
                </div>
                {canManage &&
                gymClass.status === "scheduled" &&
                (p.status === "attending" || p.status === "waitlisted") ? (
                  <div className="flex flex-wrap gap-1">
                    {p.status === "waitlisted" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => runParticipantAction("promote", p.gymMemberId)}
                      >
                        승급
                      </Button>
                    ) : null}
                    {p.status === "attending" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          runParticipantAction("waitlist", p.gymMemberId)
                        }
                      >
                        대기로
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => runParticipantAction("cancel", p.gymMemberId)}
                    >
                      참석 취소
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <GymGroupClassFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        staffOptions={staffOptions}
        fixedStaffId={fixedStaffId}
        defaults={{
          dateKey: gymClass.dateKey,
          startHm: gymClass.timeRangeLabel.slice(0, 5),
          instructorStaffId:
            fixedStaffId || gymClass.instructorStaffId || "",
        }}
        existing={existingForm}
        onSaved={() => {
          setEditOpen(false);
          refresh();
        }}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>회원 추가</DialogTitle>
          </DialogHeader>
          <label className="block space-y-1 text-sm">
            <span>회원 검색</span>
            <input
              className={matchonFieldInputClass}
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="이름 또는 전화번호 끝 4자리"
            />
          </label>
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-matchon-border p-2">
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                  selectedMemberId === m.id
                    ? "bg-primary/10"
                    : "hover:bg-muted/60",
                )}
                onClick={() => setSelectedMemberId(m.id)}
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
                  </span>
                </span>
              </button>
            ))}
            {filteredMembers.length === 0 ? (
              <p className="px-2 py-3 text-xs text-matchon-text-secondary">
                추가 가능한 회원이 없습니다.
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={pending}
            >
              닫기
            </Button>
            <Button
              type="button"
              disabled={pending || !selectedMemberId}
              onClick={addParticipant}
            >
              {pending ? "추가 중…" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-matchon-text-secondary">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
