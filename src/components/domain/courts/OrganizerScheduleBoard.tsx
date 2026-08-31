"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMatchScheduleFormAction } from "@/features/event-courts/actions";
import { CourtScheduleMatchReorderControls } from "@/components/domain/courts/CourtScheduleMatchReorderControls";
import { Button } from "@/components/ui/button";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { ScheduleMatchVM } from "@/lib/organizer-schedule";
import { MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";

export type { ScheduleMatchVM };

/**
 * 경기장 스케줄 보드 — 순서 변경은 CourtScheduleMatchReorderControls
 * → saveMatchScheduleFormAction 단일 경로(대진표 보기와 동일).
 */
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
  const [localCourts, setLocalCourts] = useState<Record<string, string | null>>(
    () => {
      const init: Record<string, string | null> = {};
      for (const m of matches) {
        init[m.matchId] = m.courtId;
      }
      return init;
    },
  );

  const allMatches = useMemo(
    () =>
      matches.map((m) => ({
        matchId: m.matchId,
        courtId: localCourts[m.matchId] ?? m.courtId,
        courtOrder: m.courtOrder,
        hasOfficialResults: m.hasOfficialResults,
      })),
    [matches, localCourts],
  );

  const filtered = useMemo(() => {
    if (activeCourtId === "all") return matches;
    if (activeCourtId === "unassigned") {
      return matches.filter((m) => !(localCourts[m.matchId] ?? m.courtId));
    }
    return matches.filter(
      (m) => (localCourts[m.matchId] ?? m.courtId) === activeCourtId,
    );
  }, [matches, activeCourtId, localCourts]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const oa = a.courtOrder ?? 9999;
      const ob = b.courtOrder ?? 9999;
      if (oa !== ob) return oa - ob;
      return a.matchId.localeCompare(b.matchId);
    });
  }, [filtered]);

  function saveCourtAssignments() {
    const updates = matches.map((m) => ({
      matchId: m.matchId,
      courtId: localCourts[m.matchId] ?? null,
      courtOrder: m.courtOrder,
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
      setMessage("경기장 배정이 저장되었습니다.");
      router.refresh();
    });
  }

  const courtChanged = matches.some(
    (m) => (localCourts[m.matchId] ?? null) !== (m.courtId ?? null),
  );

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
              {sorted.map((m) => {
                const courtId = localCourts[m.matchId] ?? m.courtId;
                const courtMatches = courtId
                  ? allMatches
                      .filter((x) => x.courtId === courtId)
                      .sort((a, b) => {
                        const oa = a.courtOrder ?? 9999;
                        const ob = b.courtOrder ?? 9999;
                        if (oa !== ob) return oa - ob;
                        return a.matchId.localeCompare(b.matchId);
                      })
                  : [];
                const showReorder =
                  activeCourtId !== "all" &&
                  activeCourtId !== "unassigned" &&
                  Boolean(courtId) &&
                  courtMatches.length > 1 &&
                  !courtChanged;

                return (
                  <tr key={m.matchId} className="border-t align-top">
                    <td className="px-3 py-2 tabular-nums text-xs font-semibold">
                      {m.courtOrder != null ? `${m.courtOrder}` : "—"}
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
                      {showReorder && courtId ? (
                        <CourtScheduleMatchReorderControls
                          eventId={eventId}
                          matchId={m.matchId}
                          courtId={courtId}
                          allMatches={allMatches}
                          courtMatches={courtMatches}
                          disabled={pending || m.hasOfficialResults}
                          onResult={(r) =>
                            setMessage(r.ok ? r.message : r.message)
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground text-[11px]">
                          {activeCourtId === "all"
                            ? "경기장 탭에서 순서 조정"
                            : courtChanged
                              ? "배정 저장 후 순서 조정"
                              : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
        <Button
          type="button"
          disabled={pending || !courtChanged}
          onClick={saveCourtAssignments}
        >
          {pending ? "저장 중…" : "경기장 배정 저장"}
        </Button>
        {message ? (
          <p className="text-muted-foreground text-xs">{message}</p>
        ) : null}
      </div>
    </section>
  );
}
