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
import type { EventCourtVM } from "@/lib/services/event-court.service";

export function EventCourtManager({
  eventId,
  courts: initialCourts,
}: {
  eventId: string;
  courts: EventCourtVM[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [courts, setCourts] = useState(initialCourts);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setMessage(res.error?.message ?? "처리 실패");
        return;
      }
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
    <section className="ring-foreground/10 flex flex-col gap-4 rounded-xl border p-4">
      <div>
        <h2 className="text-lg font-semibold">경기장 관리</h2>
        <p className="text-muted-foreground text-sm">
          경기장 추가·이름·순서·활성/비활성을 관리합니다. 삭제 대신 비활성 처리합니다.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
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
          className="border-input bg-background h-9 min-w-[12rem] flex-1 rounded-md border px-2 text-sm"
          maxLength={100}
        />
        <Button type="submit" size="sm" disabled={pending || !newName.trim()}>
          경기장 추가
        </Button>
      </form>

      {courts.length === 0 ? (
        <p className="text-muted-foreground text-sm">등록된 경기장이 없습니다.</p>
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
                        className="flex flex-wrap items-center gap-2"
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
                          className="border-input bg-background h-8 min-w-[10rem] flex-1 rounded-md border px-2 text-sm"
                          maxLength={100}
                          required
                        />
                        <Button type="submit" size="sm" className="h-8" disabled={pending}>
                          저장
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => setEditingId(null)}
                        >
                          취소
                        </Button>
                      </form>
                    ) : (
                      <>
                        <p className="font-medium">{court.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={
                              court.isActive
                                ? "rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                : "rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground"
                            }
                          >
                            {court.isActive ? "활성" : "비활성"}
                          </span>
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
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={pending || activeIdx <= 0}
                          onClick={() => moveCourt(court.id, -1)}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={
                            pending || activeIdx < 0 || activeIdx >= activeCourts.length - 1
                          }
                          onClick={() => moveCourt(court.id, 1)}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
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
                          className="h-7 px-2 text-xs"
                          disabled={pending}
                          onClick={() => {
                            const matchNote =
                              court.assignedMatchCount > 0
                                ? `\n\n이 경기장에 배정된 경기 ${court.assignedMatchCount}건이 있습니다. 비활성화해도 경기 배정은 유지되며, 대진표 보기 탭에서는 숨겨집니다.`
                                : "";
                            if (
                              !window.confirm(
                                `${court.name}을 비활성 처리할까요?${matchNote}`,
                              )
                            ) {
                              return;
                            }
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
                        className="h-7 px-2 text-xs"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `${court.name}을 다시 활성화할까요?`,
                            )
                          ) {
                            return;
                          }
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

      {message ? <p className="text-destructive text-xs">{message}</p> : null}
    </section>
  );
}
