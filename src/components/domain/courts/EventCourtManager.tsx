"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  activateEventCourtFormAction,
  createEventCourtFormAction,
  deactivateEventCourtFormAction,
  reorderEventCourtsFormAction,
  updateEventCourtNameFormAction,
} from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import {
  formControlFieldClass,
  formControlFieldCompactClass,
  formControlInlineRowClass,
} from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";

export function EventCourtManager({
  eventId,
  courts: initialCourts,
}: {
  eventId: string;
  courts: EventCourtVM[];
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [courts, setCourts] = useState(initialCourts);
  const [newName, setNewName] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setFeedback(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error?.message ?? "처리 실패" });
        return;
      }
      setFeedback({ tone: "success", message: "저장되었습니다." });
      router.refresh();
    });
  }

  function moveCourt(courtId: string, direction: -1 | 1) {
    const active = courts.filter((c) => c.isActive);
    const inactive = courts.filter((c) => !c.isActive);
    const idx = active.findIndex((c) => c.id === courtId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= active.length) return;
    const next = [...active];
    const tmp = next[idx]!;
    next[idx] = next[swapIdx]!;
    next[swapIdx] = tmp;
    const merged = [...next, ...inactive];
    setCourts(merged);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("orderedCourtIds", next.map((c) => c.id).join(","));
    run(() => reorderEventCourtsFormAction(fd));
  }

  return (
    <Card variant="default" className="py-4">
      <CardHeader className="px-4 pb-2">
        <CardTitle className="text-lg">경기장 관리</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm font-normal">
          경기장 추가·이름·순서·활성/비활성을 관리합니다. 삭제 대신 비활성 처리합니다.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">

      <form
        className={formControlInlineRowClass}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("eventId", eventId);
          fd.set("name", newName);
          run(() => createEventCourtFormAction(fd));
        }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="경기장 이름 (예: 1번 경기장)"
          className={cn(formControlFieldClass, "min-w-[12rem] flex-1")}
          maxLength={100}
        />
        <Button type="submit" size="default" disabled={pending || !newName.trim()}>
          경기장 추가
        </Button>
      </form>

      {courts.length === 0 ? (
        <BracketsEmptyState message="등록된 경기장이 없습니다." />
      ) : (
        <ul className="flex flex-col gap-3">
          {courts.map((court) => {
            const activeCourts = courts.filter((c) => c.isActive);
            const activeIdx = activeCourts.findIndex((c) => c.id === court.id);
            const isEditing = editingId === court.id;

            return (
              <li
                key={court.id}
                className="rounded-lg border bg-muted/20 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <form
                        className={formControlInlineRowClass}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData();
                          fd.set("eventId", eventId);
                          fd.set("courtId", court.id);
                          fd.set("name", editName);
                          run(() => updateEventCourtNameFormAction(fd));
                          setEditingId(null);
                        }}
                      >
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={cn(
                            formControlFieldCompactClass,
                            "min-w-[10rem] flex-1",
                          )}
                          maxLength={100}
                          required
                        />
                        <Button type="submit" size="sm" disabled={pending}>
                          저장
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          취소
                        </Button>
                      </form>
                    ) : (
                      <>
                        <p className="font-medium">{court.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <MatchonStatusBadge
                            status={court.isActive ? "active" : "inactive"}
                            label={court.isActive ? "활성" : "비활성"}
                            size="sm"
                          />
                          {court.isActive ? (
                            <span className="text-muted-foreground">
                              표시 순서 {court.sortOrder + 1}
                            </span>
                          ) : court.assignedMatchCount > 0 ? (
                            <span className="text-muted-foreground">
                              배정 경기 {court.assignedMatchCount}건
                            </span>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {court.isActive ? (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={pending || activeIdx <= 0}
                          onClick={() => moveCourt(court.id, -1)}
                          aria-label="위로"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={
                            pending || activeIdx < 0 || activeIdx >= activeCourts.length - 1
                          }
                          onClick={() => moveCourt(court.id, 1)}
                          aria-label="아래로"
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            setEditingId(court.id);
                            setEditName(court.name);
                          }}
                        >
                          이름 수정
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={async () => {
                            const matchNote =
                              court.assignedMatchCount > 0
                                ? `이 경기장에 배정된 경기 ${court.assignedMatchCount}건이 있습니다. 비활성화해도 경기 배정은 유지되며, 대진표 보기 탭에서는 숨겨집니다.`
                                : undefined;
                            const ok = await confirm({
                              title: `${court.name}을 비활성 처리할까요?`,
                              description: matchNote,
                              variant: "danger",
                            });
                            if (!ok) return;
                            const fd = new FormData();
                            fd.set("eventId", eventId);
                            fd.set("courtId", court.id);
                            run(() => deactivateEventCourtFormAction(fd));
                          }}
                        >
                          비활성
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={async () => {
                          const ok = await confirm({
                            title: `${court.name}을 다시 활성화할까요?`,
                          });
                          if (!ok) return;
                          const fd = new FormData();
                          fd.set("eventId", eventId);
                          fd.set("courtId", court.id);
                          run(() => activateEventCourtFormAction(fd));
                        }}
                      >
                        활성화
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {feedback ? (
        <FeedbackMessage tone={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.message}
        </FeedbackMessage>
      ) : null}
      </CardContent>
    </Card>
  );
}
