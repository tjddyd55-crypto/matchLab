"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  changeEventStatusAction,
  getEventArchiveFinishSummaryAction,
} from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import { EventStatus } from "@/lib/enums";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import { ORGANIZER_EVENT_STATUS_LABELS } from "@/lib/event-organizer-status";
import { buildEventFinishConfirmDescription } from "@/lib/event-completion-ui";
import { formatPublicDateTime } from "@/lib/date-display";
import { resolveOrganizerEventListMatchonStatus } from "@/lib/ui/event-list-ui";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { EventArchiveDownloadPanel } from "@/components/domain/events/EventArchiveDownloadPanel";
import { cn } from "@/lib/utils";

type Transition = { next: EventStatus; label: string; warn?: string };

function transitionsFor(status: EventStatus): Transition[] {
  switch (status) {
    case EventStatus.draft:
      return [
        { next: EventStatus.open, label: "신청 공개 (OPEN)" },
        {
          next: EventStatus.cancelled,
          label: "대회 취소",
          warn: "취소 후 공개 목록에서 제외됩니다.",
        },
      ];
    case EventStatus.open:
      return [
        { next: EventStatus.closed, label: "신청 마감" },
        {
          next: EventStatus.cancelled,
          label: "대회 취소",
          warn: "취소 후 공개 목록에서 제외됩니다.",
        },
      ];
    case EventStatus.closed:
      return [
        { next: EventStatus.bracket_ready, label: "대진표 준비 단계로" },
        { next: EventStatus.finished, label: "대회 종료" },
        {
          next: EventStatus.cancelled,
          label: "대회 취소",
          warn: "취소 후 공개 목록에서 제외됩니다.",
        },
      ];
    case EventStatus.bracket_ready:
      return [
        { next: EventStatus.ongoing, label: "대회 진행 시작" },
        { next: EventStatus.finished, label: "대회 종료" },
        {
          next: EventStatus.cancelled,
          label: "대회 취소",
          warn: "취소 후 공개 목록에서 제외됩니다.",
        },
      ];
    case EventStatus.ongoing:
      return [
        { next: EventStatus.finished, label: "대회 종료" },
        {
          next: EventStatus.cancelled,
          label: "대회 취소",
          warn: "취소 후 공개 목록에서 제외됩니다.",
        },
      ];
    case EventStatus.finished:
      return [{ next: EventStatus.ongoing, label: "대회 종료 해제" }];
    default:
      return [];
  }
}

function statusHelpText(status: EventStatus): string | null {
  switch (status) {
    case EventStatus.open:
      return "신청을 마감한 후 대진표 준비 및 대회 종료를 진행할 수 있습니다.";
    case EventStatus.closed:
    case EventStatus.bracket_ready:
    case EventStatus.ongoing:
      return "모든 경기 운영이 끝난 후 대회를 종료할 수 있습니다.";
    case EventStatus.finished:
      return '종료된 대회는 "대회 종료 해제"로 운영 상태를 복구할 수 있습니다.';
    default:
      return null;
  }
}

export function EventStatusControl({
  event,
}: {
  event: OrganizerEventDetailVM;
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const statusConfirmedRef = useRef(false);
  const [state, action, pending] = useActionState(
    changeEventStatusAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  const steps = transitionsFor(event.status);
  const helpText = statusHelpText(event.status);
  const isFinished = event.status === EventStatus.finished;

  return (
    <div className="ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">상태 변경</h2>
          <div className="flex flex-wrap items-center gap-2">
            <MatchonStatusBadge
              status={resolveOrganizerEventListMatchonStatus(event.status)}
              label={ORGANIZER_EVENT_STATUS_LABELS[event.status]}
            />
            {isFinished && event.completedAt ? (
              <span className="text-muted-foreground text-xs">
                {formatPublicDateTime(event.completedAt)} 종료
              </span>
            ) : null}
          </div>
        </div>
        {event.hasActiveArchive ? (
          <Link
            href={`/organizer/events/${event.id}/archive`}
            className={cn(
              "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
            )}
          >
            대회 기록 보기
          </Link>
        ) : null}
      </div>

      {event.status === EventStatus.draft ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <p className="font-medium">공개 전 필수</p>
          <ul className="text-muted-foreground mt-1 list-inside list-disc text-xs">
            <li>대회명·일정·장소·신청 기간</li>
            <li>경기구분 1개 이상</li>
            <li>참가비·입금 계좌 설정</li>
          </ul>
        </div>
      ) : null}
      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      {steps.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          이 상태에서는 전진 전이가 없습니다.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {steps.map((t) => (
            <form
              key={t.next}
              action={action}
              className="inline"
              onSubmit={(e) => {
                if (statusConfirmedRef.current) {
                  statusConfirmedRef.current = false;
                  return;
                }
                e.preventDefault();
                const form = e.currentTarget;
                const isCancel = t.next === EventStatus.cancelled;
                const isFinish = t.next === EventStatus.finished;
                const isReopen =
                  event.status === EventStatus.finished &&
                  t.next === EventStatus.ongoing;
                void (async () => {
                  if (isFinish) {
                    const summaryRes = await getEventArchiveFinishSummaryAction(
                      event.id,
                    );
                    const stats =
                      summaryRes.ok === true ? summaryRes.data : null;
                    const ok = await confirm({
                      title: "대회를 종료하시겠습니까?",
                      description: buildEventFinishConfirmDescription(stats),
                      confirmLabel: "대회 종료",
                      cancelLabel: "취소",
                      variant: "default",
                    });
                    if (!ok) return;
                  } else if (isReopen) {
                    const ok = await confirm({
                      title: "대회 종료 상태를 해제하시겠습니까?",
                      description:
                        "종료 해제 후 경기운영·계체·결과 입력 등 운영 데이터를 다시 수정할 수 있습니다.",
                      confirmLabel: "종료 해제",
                      cancelLabel: "취소",
                      variant: "default",
                    });
                    if (!ok) return;
                  } else {
                    const ok = await confirm({
                      title: isCancel
                        ? "대회를 취소할까요?"
                        : `상태를 "${t.label}"(으)로 변경할까요?`,
                      description: t.warn,
                      confirmLabel: isCancel ? "취소" : "변경",
                      variant: isCancel ? "danger" : "default",
                    });
                    if (!ok) return;
                  }
                  statusConfirmedRef.current = true;
                  form.requestSubmit();
                })();
              }}
            >
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="status" value={t.next} />
              <Button
                type="submit"
                disabled={pending}
                variant={
                  t.next === EventStatus.cancelled ? "destructive" : "secondary"
                }
                size="sm"
                className={cn(t.next === EventStatus.open && "border-primary")}
              >
                {t.label}
              </Button>
            </form>
          ))}
        </div>
      )}

      {isFinished && event.hasActiveArchive ? (
        <EventArchiveDownloadPanel eventId={event.id} />
      ) : null}

      {helpText ? (
        <p className="text-muted-foreground text-xs">{helpText}</p>
      ) : null}
    </div>
  );
}
