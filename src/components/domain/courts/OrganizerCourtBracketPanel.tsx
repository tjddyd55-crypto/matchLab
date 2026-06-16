"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import { saveMatchScheduleFormAction } from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import {
  type CourtTabId,
  formatCourtTabLabel,
} from "@/lib/court-tab-label";
import { BracketMatchStatus } from "@/lib/enums";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import { MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";

function sortMatchesForTab(
  matches: OrganizerEventMatchListItemVM[],
  courts: EventCourtVM[],
) {
  const courtOrder = new Map(
    courts.filter((c) => c.isActive).map((c, i) => [c.id, i]),
  );
  return [...matches].sort((a, b) => {
    const ca = a.courtId ? courtOrder.get(a.courtId) ?? 999 : 9999;
    const cb = b.courtId ? courtOrder.get(b.courtId) ?? 999 : 9999;
    if (ca !== cb) return ca - cb;
    const oa = a.courtOrder ?? a.matchOrder ?? 9999;
    const ob = b.courtOrder ?? b.matchOrder ?? 9999;
    return oa - ob;
  });
}

function courtLabelForMatch(
  m: OrganizerEventMatchListItemVM,
  courts: EventCourtVM[],
): string {
  if (!m.courtId) return "미지정";
  const idx = courts.findIndex((c) => c.id === m.courtId);
  if (idx >= 0) return formatCourtTabLabel(courts[idx]!, idx);
  return m.courtName ?? "경기장";
}

function matchStatusLabel(status: OrganizerEventMatchListItemVM["status"]) {
  switch (status) {
    case BracketMatchStatus.ongoing:
      return "진행중";
    case BracketMatchStatus.finished:
      return "경기종료";
    case BracketMatchStatus.cancelled:
      return "경기취소";
    default:
      return "대기";
  }
}

export function OrganizerCourtBracketPanel({
  eventId,
  courts,
  matches,
  showOrderSection = true,
}: {
  eventId: string;
  courts: EventCourtVM[];
  matches: OrganizerEventMatchListItemVM[];
  /** schedule 페이지에서는 순서 섹션 제목만 다르게 */
  showOrderSection?: boolean;
}) {
  const router = useRouter();
  const activeCourts = courts.filter((c) => c.isActive);
  const [activeTab, setActiveTab] = useState<CourtTabId>("all");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [localOrders, setLocalOrders] = useState<Record<string, number | null>>(
    () => {
      const init: Record<string, number | null> = {};
      for (const m of matches) init[m.matchId] = m.courtOrder;
      return init;
    },
  );

  const filtered = useMemo(() => {
    const sorted = sortMatchesForTab(matches, activeCourts);
    if (activeTab === "all") return sorted;
    return sorted.filter((m) => m.courtId === activeTab);
  }, [matches, activeTab, activeCourts]);

  const canReorder = activeTab !== "all" && filtered.length > 0;

  function move(matchId: string, direction: -1 | 1) {
    const idx = filtered.findIndex((m) => m.matchId === matchId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= filtered.length) return;
    const a = filtered[idx]!;
    const b = filtered[swapIdx]!;
    const orderA = localOrders[a.matchId] ?? idx + 1;
    const orderB = localOrders[b.matchId] ?? swapIdx + 1;
    setLocalOrders((prev) => ({
      ...prev,
      [a.matchId]: orderB,
      [b.matchId]: orderA,
    }));
  }

  function saveOrder() {
    const updates = matches.map((m) => ({
      matchId: m.matchId,
      courtId: m.courtId ?? null,
      courtOrder: localOrders[m.matchId] ?? m.courtOrder ?? null,
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
      setMessage("순서가 저장되었습니다.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold">경기장별 대진표</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          탭으로 경기장을 선택해 경기를 확인하고, 경기장 탭에서 순서를 조정할 수
          있습니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeTab === "all" ? "default" : "outline"}
          onClick={() => setActiveTab("all")}
        >
          전체
        </Button>
        {activeCourts.map((c, idx) => (
          <Button
            key={c.id}
            type="button"
            size="sm"
            variant={activeTab === c.id ? "default" : "outline"}
            onClick={() => setActiveTab(c.id)}
          >
            {formatCourtTabLabel(c, idx)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
          표시할 경기가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((m, idx) => (
            <article
              key={m.matchId}
              className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 text-sm">
                  <p className="text-muted-foreground text-xs">
                    {courtLabelForMatch(m, courts)}
                    {m.courtOrder != null || localOrders[m.matchId] != null
                      ? ` · ${localOrders[m.matchId] ?? m.courtOrder}경기`
                      : ""}
                  </p>
                  <p className="font-medium">
                    {m.divisionLabel ?? MATCH_CATEGORY_LABEL}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {m.bracketTitle}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canReorder ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        aria-label="경기 순서"
                        className="border-input bg-background h-7 w-14 rounded-md border px-1 text-xs"
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
                        disabled={idx === filtered.length - 1}
                        onClick={() => move(m.matchId, 1)}
                      >
                        ↓
                      </Button>
                    </>
                  ) : null}
                  <span className="rounded-full border px-2 py-1 text-xs font-medium">
                    {matchStatusLabel(m.status)}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="rounded-md border px-3 py-3 text-sm">
                  <p className="text-muted-foreground text-xs">선수 A</p>
                  <p className="mt-1 text-base font-semibold">
                    {m.fighterRed?.name ?? "-"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {m.fighterRed?.gymName ?? "-"}
                  </p>
                  <FighterHandicapBadge
                    handicap={m.fighterRed?.handicap}
                    cornerLabel="홍코너"
                    compact
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-center">
                  <span className="rounded-full border bg-muted px-3 py-2 text-xs font-semibold tracking-wide">
                    VS
                  </span>
                </div>
                <div className="rounded-md border px-3 py-3 text-sm md:text-right">
                  <p className="text-muted-foreground text-xs">선수 B</p>
                  <p className="mt-1 text-base font-semibold">
                    {m.fighterBlue?.name ?? "-"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {m.fighterBlue?.gymName ?? "-"}
                  </p>
                  <FighterHandicapBadge
                    handicap={m.fighterBlue?.handicap}
                    cornerLabel="청코너"
                    compact
                    className="mt-1 md:ml-auto"
                  />
                </div>
              </div>

              <div className="mt-2">
                <MatchCourtControls
                  key={`${m.matchId}:${m.courtId ?? ""}:${m.courtOrder ?? ""}`}
                  inline
                  eventId={eventId}
                  bracketId={m.bracketId}
                  matchId={m.matchId}
                  courts={courts}
                  courtId={m.courtId}
                  courtOrder={localOrders[m.matchId] ?? m.courtOrder}
                  hasOfficialResults={m.hasOfficialResults}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {showOrderSection && matches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {canReorder ? (
            <Button type="button" disabled={pending} onClick={saveOrder}>
              {pending ? "저장 중…" : "이 경기장 순서 저장"}
            </Button>
          ) : (
            <p className="text-muted-foreground text-xs">
              경기장 탭(1경기장, 2경기장 등)을 선택하면 해당 경기장 경기 순서를
              조정할 수 있습니다.
            </p>
          )}
          {message ? (
            <p className="text-muted-foreground text-xs">{message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
