"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMatchScheduleFormAction } from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { ScheduleMatchVM } from "@/lib/organizer-schedule";
import { MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";

export type { ScheduleMatchVM };

export function OrganizerScheduleBoard({
  eventId,
  courts,
  matches,
}: {
  eventId: string;
  courts: EventCourtVM[];
  matches: ScheduleMatchVM[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [activeCourtId, setActiveCourtId] = useState<string | "unassigned" | "all">(
    "all",
  );
  const [localOrders, setLocalOrders] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    for (const m of matches) {
      init[m.matchId] = m.courtOrder;
    }
    return init;
  });
  const [localCourts, setLocalCourts] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const m of matches) {
      init[m.matchId] = m.courtId;
    }
    return init;
  });

  const filtered = useMemo(() => {
    if (activeCourtId === "all") return matches;
    if (activeCourtId === "unassigned") {
      return matches.filter((m) => !localCourts[m.matchId]);
    }
    return matches.filter((m) => localCourts[m.matchId] === activeCourtId);
  }, [matches, activeCourtId, localCourts]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const oa = localOrders[a.matchId] ?? 9999;
      const ob = localOrders[b.matchId] ?? 9999;
      return oa - ob;
    });
  }, [filtered, localOrders]);

  function move(matchId: string, direction: -1 | 1) {
    const idx = sorted.findIndex((m) => m.matchId === matchId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx]!;
    const b = sorted[swapIdx]!;
    const orderA = localOrders[a.matchId] ?? idx + 1;
    const orderB = localOrders[b.matchId] ?? swapIdx + 1;
    setLocalOrders((prev) => ({
      ...prev,
      [a.matchId]: orderB,
      [b.matchId]: orderA,
    }));
  }

  function save() {
    const updates = matches.map((m) => ({
      matchId: m.matchId,
      courtId: localCourts[m.matchId] ?? null,
      courtOrder: localOrders[m.matchId] ?? null,
    }));
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("updates", JSON.stringify(updates));
    startTransition(async () => {
      const res = await saveMatchScheduleFormAction(fd);
      if (!res.ok) {
        setMessage(res.error.message);
        return;
      }
      setMessage("저장되었습니다.");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeCourtId === "all" ? "default" : "outline"}
          onClick={() => setActiveCourtId("all")}
        >
          전체
        </Button>
        {courts
          .filter((c) => c.isActive)
          .map((c) => (
            <Button
              key={c.id}
              type="button"
              size="sm"
              variant={activeCourtId === c.id ? "default" : "outline"}
              onClick={() => setActiveCourtId(c.id)}
            >
              {c.name}
            </Button>
          ))}
        <Button
          type="button"
          size="sm"
          variant={activeCourtId === "unassigned" ? "default" : "outline"}
          onClick={() => setActiveCourtId("unassigned")}
        >
          미지정
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            이 탭에 표시할 경기가 없습니다.
          </p>
        ) : (
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="px-3 py-2">순서</th>
              <th className="px-3 py-2">경기장</th>
              <th className="px-3 py-2">{MATCH_CATEGORY_LABEL}/체급</th>
              <th className="px-3 py-2">선수</th>
              <th className="px-3 py-2">조정</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, idx) => (
              <tr key={m.matchId} className="border-t align-top">
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    className="border-input bg-background h-8 w-16 rounded-md border px-2 text-xs"
                    value={localOrders[m.matchId] ?? ""}
                    onChange={(e) =>
                      setLocalOrders((prev) => ({
                        ...prev,
                        [m.matchId]: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                    value={localCourts[m.matchId] ?? ""}
                    onChange={(e) =>
                      setLocalCourts((prev) => ({
                        ...prev,
                        [m.matchId]: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">미지정</option>
                    {courts
                      .filter((c) => c.isActive)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs">
                  <div>{m.divisionLabel ?? "—"}</div>
                  <div className="text-muted-foreground">{m.bracketTitle}</div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {m.fighterRedName ?? "—"} vs {m.fighterBlueName ?? "—"}
                  {m.hasOfficialResults ? (
                    <p className="text-amber-700 dark:text-amber-300">
                      결과 확정 경기 — 순서만 변경됩니다
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={idx === 0}
                      onClick={() => move(m.matchId, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={idx === sorted.length - 1}
                      onClick={() => move(m.matchId, 1)}
                    >
                      ↓
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          정렬할 경기가 없습니다.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "저장 중…" : "순서 저장"}
        </Button>
        {message ? (
          <p className="text-muted-foreground text-xs">{message}</p>
        ) : null}
      </div>
    </section>
  );
}
