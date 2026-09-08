"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { changeEventStatusAction, getEventArchiveFinishSummaryAction } from "@/features/events/actions";
import { EventStatus } from "@/lib/enums";
import type { EventArchiveFinishSummary } from "@/lib/event-archive/types";
import { ORGANIZER_EVENT_STATUS_LABELS } from "@/lib/event-organizer-status";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { resolveOrganizerEventListMatchonStatus } from "@/lib/ui/event-list-ui";
import { formatPublicDateTime } from "@/lib/date-display";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
import { EventArchiveDownloadPanel } from "@/components/domain/events/EventArchiveDownloadPanel";

function buildFinishDescription(stats: EventArchiveFinishSummary | null): string {
  const lines = [
    "종료 후:",
    "· 대회 상태가 \"대회 종료\"로 변경됩니다.",
    "· 신청자, 대진표, 계체, 경기 결과 등의 기록은 보존됩니다.",
    "· 종료 후에는 기본적으로 운영 데이터가 읽기 전용으로 전환됩니다.",
    "· 필요 시 기록을 다운로드할 수 있습니다.",
  ];
  if (stats) {
    lines.push(
      "",
      `신청자 ${stats.applicantCount}명`,
      `총 경기 ${stats.totalMatchCount}경기 · 경기 종료 ${stats.completedMatchCount}경기`,
    );
    if (stats.pendingMatchCount > 0) {
      lines.push(`경기 미종료 ${stats.pendingMatchCount}경기`);
    }
    if (stats.unconfirmedResultCount > 0) {
      lines.push(`결과 미입력 ${stats.unconfirmedResultCount}경기`);
    }
    if (stats.weighInPendingCount > 0) {
      lines.push(`계체 미완료 ${stats.weighInPendingCount}명`);
    }
    const warnings = [
      stats.unconfirmedResultCount > 0
        ? `결과 미입력 경기가 ${stats.unconfirmedResultCount}건 있습니다.`
        : null,
      stats.pendingMatchCount > 0
        ? `미종료 경기가 ${stats.pendingMatchCount}건 있습니다.`
        : null,
    ].filter(Boolean);
    if (warnings.length > 0) {
      lines.push("", `${warnings.join(" ")} 그래도 종료하시겠습니까?`);
    }
  }
  return lines.join("\n");
}

const FINISHABLE_STATUSES: EventStatus[] = [
  EventStatus.closed,
  EventStatus.bracket_ready,
  EventStatus.ongoing,
];

export function EventCompletionPanel({
  eventId,
  status,
  completedAt,
  hasActiveArchive,
  className,
}: {
  eventId: string;
  status: EventStatus;
  completedAt: string | null;
  hasActiveArchive: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isFinished = status === EventStatus.finished;
  const canFinish = FINISHABLE_STATUSES.includes(status);

  async function submitStatus(next: EventStatus) {
    setError(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("status", next);
    startTransition(async () => {
      const res = await changeEventStatusAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  async function onFinishClick() {
    const summaryRes = await getEventArchiveFinishSummaryAction(eventId);
    const stats = summaryRes.ok ? summaryRes.data : null;
    const ok = await confirm({
      title: "대회를 종료하시겠습니까?",
      description: buildFinishDescription(stats),
      confirmLabel: "대회 종료",
      cancelLabel: "취소",
      variant: "default",
    });
    if (!ok) return;
    await submitStatus(EventStatus.finished);
  }

  async function onReopenClick() {
    const ok = await confirm({
      title: "대회 종료 상태를 해제하시겠습니까?",
      description:
        "종료 해제 후 경기운영·계체·결과 입력 등 운영 데이터를 다시 수정할 수 있습니다.",
      confirmLabel: "종료 해제",
      cancelLabel: "취소",
      variant: "default",
    });
    if (!ok) return;
    await submitStatus(EventStatus.ongoing);
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#0F172A]">대회 상태</p>
          <MatchonStatusBadge
            status={resolveOrganizerEventListMatchonStatus(status)}
            label={ORGANIZER_EVENT_STATUS_LABELS[status]}
          />
          {isFinished && completedAt ? (
            <p className="text-muted-foreground text-xs">
              {formatPublicDateTime(completedAt)} 종료
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canFinish ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => void onFinishClick()}
            >
              대회 종료
            </Button>
          ) : null}
          {isFinished ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void onReopenClick()}
            >
              대회 종료 해제
            </Button>
          ) : null}
          {hasActiveArchive ? (
            <Link
              href={`/organizer/events/${eventId}/archive`}
              className={cn(
                "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
              )}
            >
              대회 기록 보기
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {isFinished && hasActiveArchive ? (
        <EventArchiveDownloadPanel eventId={eventId} />
      ) : null}
    </div>
  );
}
