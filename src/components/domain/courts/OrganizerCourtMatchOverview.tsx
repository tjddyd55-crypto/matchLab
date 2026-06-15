"use client";

import { useMemo, useState } from "react";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import { Button } from "@/components/ui/button";
import { MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";

type CourtTab = "all" | "unassigned" | string;

function sortMatches(matches: OrganizerEventMatchListItemVM[]) {
  return [...matches].sort((a, b) => {
    const courtA = a.courtName ?? "\uffff";
    const courtB = b.courtName ?? "\uffff";
    if (courtA !== courtB) return courtA.localeCompare(courtB, "ko");
    const orderA = a.courtOrder ?? a.matchOrder ?? 9999;
    const orderB = b.courtOrder ?? b.matchOrder ?? 9999;
    return orderA - orderB;
  });
}

export function OrganizerCourtMatchOverview({
  eventId,
  courts,
  matches,
}: {
  eventId: string;
  courts: EventCourtVM[];
  matches: OrganizerEventMatchListItemVM[];
}) {
  const [activeTab, setActiveTab] = useState<CourtTab>("all");

  const filtered = useMemo(() => {
    const sorted = sortMatches(matches);
    if (activeTab === "all") return sorted;
    if (activeTab === "unassigned") {
      return sorted.filter((m) => !m.courtId);
    }
    return sorted.filter((m) => m.courtId === activeTab);
  }, [matches, activeTab]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold">경기장별 대진표</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          경기장별로 전체 경기를 확인하고 경기장·순서를 지정합니다.
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
        {courts.map((c) => (
          <Button
            key={c.id}
            type="button"
            size="sm"
            variant={activeTab === c.id ? "default" : "outline"}
            onClick={() => setActiveTab(c.id)}
          >
            {c.name}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={activeTab === "unassigned" ? "default" : "outline"}
          onClick={() => setActiveTab("unassigned")}
        >
          미지정
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
          {activeTab === "unassigned"
            ? "미지정 경기가 없습니다."
            : "표시할 경기가 없습니다."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((m) => (
            <article
              key={m.matchId}
              className="ring-foreground/10 rounded-xl border bg-card p-3 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {m.courtName ? (
                      <>
                        {m.courtName}
                        {m.courtOrder != null ? ` · ${m.courtOrder}경기` : ""}
                      </>
                    ) : (
                      <span className="text-muted-foreground">경기장 미지정</span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {m.divisionLabel ?? MATCH_CATEGORY_LABEL} · {m.bracketTitle}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">{m.status}</span>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border px-2 py-1.5 text-xs">
                  <p className="text-muted-foreground">홍코너</p>
                  <p className="font-medium">{m.fighterRed?.name ?? "—"}</p>
                  <FighterHandicapBadge
                    handicap={m.fighterRed?.handicap}
                    compact
                    className="mt-0.5"
                  />
                </div>
                <div className="rounded-md border px-2 py-1.5 text-xs">
                  <p className="text-muted-foreground">청코너</p>
                  <p className="font-medium">{m.fighterBlue?.name ?? "—"}</p>
                  <FighterHandicapBadge
                    handicap={m.fighterBlue?.handicap}
                    compact
                    className="mt-0.5"
                  />
                </div>
              </div>

              <div className="mt-2">
                <MatchCourtControls
                  inline
                  eventId={eventId}
                  bracketId={m.bracketId}
                  matchId={m.matchId}
                  courts={courts}
                  courtId={m.courtId}
                  courtOrder={m.courtOrder}
                  hasOfficialResults={m.hasOfficialResults}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
