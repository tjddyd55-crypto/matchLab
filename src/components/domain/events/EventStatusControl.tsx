"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { changeEventStatusAction, getEventArchiveFinishSummaryAction } from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import { EventStatus } from "@/lib/enums";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { cn } from "@/lib/utils";

type Transition = { next: EventStatus; label: string; warn?: string };

function transitionsFor(status: EventStatus): Transition[] {
  switch (status) {
    case EventStatus.draft:
      return [
        { next: EventStatus.open, label: "신청 공개 (OPEN)" },
        { next: EventStatus.cancelled, label: "대회 취소", warn: "취소 후 공개 목록에서 제외됩니다." },
      ];
    case EventStatus.open:
      return [
        { next: EventStatus.closed, label: "신청 마감" },
        { next: EventStatus.cancelled, label: "대회 취소", warn: "취소 후 공개 목록에서 제외됩니다." },
      ];
    case EventStatus.closed:
      return [
        { next: EventStatus.bracket_ready, label: "대진표 준비 단계로" },
        { next: EventStatus.finished, label: "대회 종료" },
        { next: EventStatus.cancelled, label: "대회 취소", warn: "취소 후 공개 목록에서 제외됩니다." },
      ];
    case EventStatus.bracket_ready:
      return [
        { next: EventStatus.ongoing, label: "대회 진행 시작" },
        { next: EventStatus.finished, label: "대회 종료" },
        { next: EventStatus.cancelled, label: "대회 취소", warn: "취소 후 공개 목록에서 제외됩니다." },
      ];
    case EventStatus.ongoing:
      return [
        { next: EventStatus.finished, label: "대회 종료" },
        { next: EventStatus.cancelled, label: "대회 취소", warn: "취소 후 공개 목록에서 제외됩니다." },
      ];
    case EventStatus.finished:
      return [
        { next: EventStatus.ongoing, label: "대회 종료 해제" },
      ];
    default:
      return [];
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

  return (
    <div className="ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <h2 className="text-lg font-semibold">상태 변경</h2>
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
        <p className="text-muted-foreground text-sm">이 상태에서는 전진 전이가 없습니다.</p>
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
                    const warningParts = [
                      stats && stats.unconfirmedResultCount > 0
                        ? `결과 미입력 경기가 ${stats.unconfirmedResultCount}건 있습니다.`
                        : null,
                      stats && stats.pendingMatchCount > 0
                        ? `미종료 경기가 ${stats.pendingMatchCount}건 있습니다.`
                        : null,
                    ].filter(Boolean);
                    const description = [
                      "종료 후:",
                      "· 대회 상태가 \"대회 종료\"로 변경됩니다.",
                      "· 신청자, 대진표, 계체, 경기 결과 등의 기록은 보존됩니다.",
                      "· 종료 후에는 기본적으로 운영 데이터가 읽기 전용으로 전환됩니다.",
                      "· 필요 시 기록을 다운로드할 수 있습니다.",
                      stats
                        ? [
                            "",
                            `신청자 ${stats.applicantCount}명`,
                            `총 경기 ${stats.totalMatchCount}경기 · 경기 종료 ${stats.completedMatchCount}경기`,
                            stats.weighInPendingCount > 0
                              ? `계체 미완료 ${stats.weighInPendingCount}명`
                              : null,
                          ]
                            .filter(Boolean)
                            .join("\n")
                        : "",
                      warningParts.length > 0
                        ? `\n${warningParts.join(" ")} 그래도 종료하시겠습니까?`
                        : "",
                    ]
                      .filter(Boolean)
                      .join("\n");
                    const ok = await confirm({
                      title: "대회를 종료하시겠습니까?",
                      description,
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
                variant={t.next === EventStatus.cancelled ? "destructive" : "secondary"}
                size="sm"
                className={cn(t.next === EventStatus.open && "border-primary")}
              >
                {t.label}
              </Button>
            </form>
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        종료된 대회는 &quot;대회 종료 해제&quot;로 운영 상태를 복구할 수 있습니다.
      </p>
    </div>
  );
}
