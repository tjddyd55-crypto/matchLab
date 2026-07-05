"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BracketMatchColumnHeader,
  BracketMatchCompactRow,
  BracketMatchControlsRow,
} from "@/components/domain/brackets/BracketMatchCompactRow";
import { BracketMatchCenterCell } from "@/components/domain/brackets/BracketMatchCenterCell";
import { BracketFighterCompactCard } from "@/components/domain/brackets/BracketFighterCompactCard";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import {
  BoutFormatBadge,
  PublicSparringUnderVsBadge,
} from "@/components/domain/shared/BoutFormatBadge";
import {
  parseMatchOperationalSettings,
  formatOperationalSettingsLabel,
} from "@/lib/match-operational-settings";
import { saveMatchScheduleFormAction } from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import {
  type CourtTabId,
  formatCourtTabLabel,
} from "@/lib/court-tab-label";
import { sortMatchesByCourtSchedule } from "@/lib/court-match-order";
import { MatchStatusBadge } from "@/components/domain/shared/MatchStatusBadge";
import { resolveBoutFormatKind } from "@/lib/bout-format";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type {
  OrganizerEventMatchListItemVM,
  OrganizerEventMatchFighterVM,
} from "@/lib/services/match.service";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import { cn } from "@/lib/utils";

function sortMatchesForTab(
  matches: OrganizerEventMatchListItemVM[],
  courts: EventCourtVM[],
) {
  return sortMatchesByCourtSchedule(
    matches.map((m) => ({ ...m, matchId: m.matchId })),
    courts
      .filter((c) => c.isActive)
      .map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
  );
}

function resolveCourtMatchOrderLabel(
  m: OrganizerEventMatchListItemVM,
  courtOrder: number | null,
): string {
  if (courtOrder != null) return `${courtOrder}경기`;
  return formatMatchOrderShort(m);
}

function CourtBracketFighterCell({
  corner,
  name,
  gymName,
  handicap,
}: {
  corner: "홍코너" | "청코너";
  name: string;
  gymName: string | null;
  handicap: OrganizerEventMatchFighterVM["handicap"];
}) {
  const style = CORNER_SLOT_STYLES[corner];
  const empty = !name?.trim() || name === "-";

  return (
    <div className={cn("w-full min-w-0 rounded-md border px-2 py-1.5", style.bg)}>
      <BracketFighterCompactCard
        empty={empty}
        emptyLabel="빈 슬롯"
        fighterName={empty ? undefined : name}
        gymName={empty ? undefined : (gymName ?? undefined)}
      >
        {!empty ? (
          <FighterHandicapBadge
            handicap={handicap}
            cornerLabel={corner}
            compact
            className="mt-0.5"
          />
        ) : null}
      </BracketFighterCompactCard>
    </div>
  );
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

  const [orderOverrides, setOrderOverrides] = useState<
    Record<string, number | null>
  >({});

  const serverOrders = useMemo(() => {
    const init: Record<string, number | null> = {};
    for (const m of matches) init[m.matchId] = m.courtOrder;
    return init;
  }, [matches]);

  const localOrders = useMemo(
    () => ({ ...serverOrders, ...orderOverrides }),
    [serverOrders, orderOverrides],
  );

  const filtered = useMemo(() => {
    const sorted = sortMatchesForTab(matches, activeCourts);
    if (activeTab === "all") return sorted;
    return sorted.filter((m) => m.courtId === activeTab);
  }, [matches, activeTab, activeCourts]);

  const canReorderOnTab = activeTab !== "all" && filtered.length > 0;

  function reorderCourtIdForMatch(
    m: OrganizerEventMatchListItemVM,
  ): string | null {
    if (activeTab !== "all") return activeTab;
    return m.courtId;
  }

  function courtMatchesForReorder(
    m: OrganizerEventMatchListItemVM,
  ): OrganizerEventMatchListItemVM[] {
    const courtId = reorderCourtIdForMatch(m);
    if (!courtId) return [];
    return filtered.filter((x) => x.courtId === courtId);
  }

  function canShowReorderControls(m: OrganizerEventMatchListItemVM): boolean {
    const courtId = reorderCourtIdForMatch(m);
    if (!courtId) return false;
    return courtMatchesForReorder(m).length > 1;
  }

  function moveAndSave(matchId: string, direction: -1 | 1) {
    if (pending) return;
    const match = filtered.find((m) => m.matchId === matchId);
    if (!match) return;
    const courtId = reorderCourtIdForMatch(match);
    if (!courtId) return;

    const courtMatches = courtMatchesForReorder(match);
    const idx = courtMatches.findIndex((m) => m.matchId === matchId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= courtMatches.length) return;

    const reordered = [...courtMatches];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, removed!);

    const updates = reordered.map((m, i) => ({
      matchId: m.matchId,
      courtId,
      courtOrder: i + 1,
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
      setOrderOverrides({});
      router.refresh();
    });
  }

  function saveOrder() {
    const courtId = activeTab === "all" ? null : activeTab;
    const courtMatches = courtId
      ? matches.filter((m) => m.courtId === courtId)
      : [];

    const sortedCourtMatches =
      courtId && courtMatches.length > 0
        ? [...courtMatches].sort((a, b) => {
            const oa = localOrders[a.matchId] ?? a.courtOrder ?? 9999;
            const ob = localOrders[b.matchId] ?? b.courtOrder ?? 9999;
            if (oa !== ob) return oa - ob;
            return a.matchId.localeCompare(b.matchId);
          })
        : [];

    const updates =
      courtId && sortedCourtMatches.length > 0
        ? sortedCourtMatches.map((m, idx) => ({
            matchId: m.matchId,
            courtId,
            courtOrder: idx + 1,
          }))
        : matches.map((m) => ({
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
      setOrderOverrides({});
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
        <div className="flex flex-col gap-2">
          <BracketMatchColumnHeader />
          {filtered.map((m) => {
            const ops = parseMatchOperationalSettings(m.resultMemo).settings;
            const order = localOrders[m.matchId] ?? m.courtOrder;
            const formatKind = resolveBoutFormatKind({
              bracketType: m.bracketType,
              bracketIsPublic: m.bracketIsPublic,
              matchIsPublicSparring: m.matchIsPublicSparring,
              resultMemo: m.resultMemo,
            });
            const courtMatches = courtMatchesForReorder(m);
            const courtIdx = courtMatches.findIndex(
              (x) => x.matchId === m.matchId,
            );
            const showReorder = canShowReorderControls(m);

            return (
              <BracketMatchCompactRow
                key={m.matchId}
                matchOrderLabel={resolveCourtMatchOrderLabel(m, order)}
                statusArea={<MatchStatusBadge status={m.status} size="sm" />}
                redSlot={
                  <CourtBracketFighterCell
                    corner="홍코너"
                    name={m.fighterRed?.name ?? ""}
                    gymName={m.fighterRed?.gymName ?? null}
                    handicap={m.fighterRed?.handicap ?? null}
                  />
                }
                center={
                  <BracketMatchCenterCell
                    badges={
                      <>
                        {formatKind !== "public_sparring" ? (
                          <BoutFormatBadge
                            bracketType={m.bracketType}
                            bracketIsPublic={m.bracketIsPublic}
                            matchIsPublicSparring={m.matchIsPublicSparring}
                            resultMemo={m.resultMemo}
                          />
                        ) : null}
                        <PublicSparringUnderVsBadge
                          bracketType={m.bracketType}
                          bracketIsPublic={m.bracketIsPublic}
                          matchIsPublicSparring={m.matchIsPublicSparring}
                          resultMemo={m.resultMemo}
                        />
                      </>
                    }
                  />
                }
                blueSlot={
                  <CourtBracketFighterCell
                    corner="청코너"
                    name={m.fighterBlue?.name ?? ""}
                    gymName={m.fighterBlue?.gymName ?? null}
                    handicap={m.fighterBlue?.handicap ?? null}
                  />
                }
                controls={
                  <BracketMatchControlsRow
                    left={
                      <MatchCourtControls
                        key={`${m.matchId}:${m.courtId ?? ""}:${m.courtOrder ?? ""}`}
                        inline
                        hideCourtOrder
                        hideLabels
                        compactRow
                        eventId={eventId}
                        bracketId={m.bracketId}
                        matchId={m.matchId}
                        courts={courts}
                        courtId={m.courtId}
                        courtOrder={localOrders[m.matchId] ?? m.courtOrder}
                        hasOfficialResults={m.hasOfficialResults}
                      />
                    }
                    center={
                      <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                        {formatOperationalSettingsLabel(ops)}
                      </span>
                    }
                    right={
                      showReorder ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            aria-label="경기 순서"
                            className="border-input bg-background h-8 w-14 rounded-md border px-1 text-xs"
                            value={localOrders[m.matchId] ?? ""}
                            onChange={(e) =>
                              setOrderOverrides((prev) => ({
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
                            className="h-8 w-8 shrink-0 p-0 text-base font-bold disabled:opacity-40"
                            aria-label="위로 이동"
                            disabled={courtIdx <= 0 || pending}
                            onClick={() => moveAndSave(m.matchId, -1)}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 shrink-0 p-0 text-base font-bold disabled:opacity-40"
                            aria-label="아래로 이동"
                            disabled={
                              courtIdx < 0 ||
                              courtIdx >= courtMatches.length - 1 ||
                              pending
                            }
                            onClick={() => moveAndSave(m.matchId, 1)}
                          >
                            ↓
                          </Button>
                        </>
                      ) : null
                    }
                  />
                }
              />
            );
          })}
        </div>
      )}

      {showOrderSection && matches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {canReorderOnTab ? (
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
