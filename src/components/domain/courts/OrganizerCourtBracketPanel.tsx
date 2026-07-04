"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import { BoutFormatBadge, PublicSparringUnderVsBadge } from "@/components/domain/shared/BoutFormatBadge";
import { parseMatchOperationalSettings, formatOperationalSettingsLabel } from "@/lib/match-operational-settings";
import { saveMatchScheduleFormAction } from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import {
  type CourtTabId,
  formatCourtTabLabel,
} from "@/lib/court-tab-label";
import { sortMatchesByCourtSchedule } from "@/lib/court-match-order";
import { MatchStatusBadge } from "@/components/domain/shared/MatchStatusBadge";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import { resolveBoutFormatKind } from "@/lib/bout-format";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type {
  OrganizerEventMatchListItemVM,
  OrganizerEventMatchFighterVM,
} from "@/lib/services/match.service";
import { MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";
import {
  formatDivisionMainLabel,
} from "@/lib/event-division-fields";
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


function matchOrderLabel(m: OrganizerEventMatchListItemVM, courtOrder: number | null) {
  if (courtOrder != null) return `제${courtOrder}경기`;
  if (m.matchNumber != null) return `제${m.matchNumber}경기`;
  if (m.globalMatchOrder != null) return `제${m.globalMatchOrder + 1}경기`;
  return `제${m.matchOrder + 1}경기`;
}

function resolveFighterDisplayName(name: string | undefined | null): string {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === "-") return "빈 슬롯";
  return trimmed;
}

function OrganizerFighterSlot({
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
  const displayName = resolveFighterDisplayName(name);
  const empty = displayName === "빈 슬롯";
  return (
    <div
      className={cn(
        "flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-md border px-3 py-2 text-center text-sm",
        style.bg,
        empty && "text-muted-foreground",
      )}
    >
      <p className={cn(bracketCardTypography.fighterCorner, style.accent)}>
        {corner}
      </p>
      <p
        className={cn(
          bracketCardTypography.fighterName,
          empty && "font-normal",
        )}
      >
        {displayName}
      </p>
      {gymName?.trim() ? (
        <p className={bracketCardTypography.fighterGym}>{gymName}</p>
      ) : null}
      {!empty ? (
        <FighterHandicapBadge
          handicap={handicap}
          cornerLabel={corner}
          compact
          className="mt-0.5 items-center"
        />
      ) : null}
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

  /**
   * 위/아래 화살표 — 인접 경기와 순서를 교체하고 즉시 저장한다.
   * 전체 탭에서도 경기장이 배정된 경우 같은 경기장 내 순서 변경을 허용한다.
   */
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
        <div className="flex flex-col gap-3">
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
            const mainLabel = m.division
              ? formatDivisionMainLabel(m.division)
              : (m.divisionLabel ?? MATCH_CATEGORY_LABEL);

            return (
            <article
              key={m.matchId}
              className="overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-primary/10"
            >
              <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      bracketCardTypography.headerRow,
                      "flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
                    )}
                  >
                    <span className={bracketCardTypography.matchNumber}>
                      {matchOrderLabel(m, order)}
                    </span>
                    <span className={bracketCardTypography.division}>
                      {mainLabel}
                    </span>
                    {order != null ? (
                      <span className="text-muted-foreground text-xs">
                        {order}경기
                      </span>
                    ) : null}
                  </p>
                </div>
                <MatchStatusBadge status={m.status} size="md" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
                <OrganizerFighterSlot
                  corner="홍코너"
                  name={m.fighterRed?.name ?? ""}
                  gymName={m.fighterRed?.gymName ?? null}
                  handicap={m.fighterRed?.handicap ?? null}
                />
                <div className="bg-muted/20 flex flex-col items-center justify-center px-4 py-2 md:min-w-[4.5rem] md:py-3">
                  <span className={bracketCardTypography.vs}>VS</span>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                    {formatKind !== "public_sparring" ? (
                      <BoutFormatBadge
                        bracketType={m.bracketType}
                        bracketIsPublic={m.bracketIsPublic}
                        matchIsPublicSparring={m.matchIsPublicSparring}
                        resultMemo={m.resultMemo}
                        className={bracketCardTypography.formatBadge}
                      />
                    ) : null}
                    <PublicSparringUnderVsBadge
                      bracketType={m.bracketType}
                      bracketIsPublic={m.bracketIsPublic}
                      matchIsPublicSparring={m.matchIsPublicSparring}
                      resultMemo={m.resultMemo}
                    />
                  </div>
                </div>
                <OrganizerFighterSlot
                  corner="청코너"
                  name={m.fighterBlue?.name ?? ""}
                  gymName={m.fighterBlue?.gymName ?? null}
                  handicap={m.fighterBlue?.handicap ?? null}
                />
              </div>

              <div className="flex justify-center border-t bg-muted/10 px-3 py-1.5">
                <span
                  className={cn(
                    bracketCardTypography.opsPill,
                    "text-muted-foreground",
                  )}
                >
                  {formatOperationalSettingsLabel(ops)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
                <div className="min-w-0 flex-1">
                  <MatchCourtControls
                    key={`${m.matchId}:${m.courtId ?? ""}:${m.courtOrder ?? ""}`}
                    inline
                    hideCourtOrder
                    eventId={eventId}
                    bracketId={m.bracketId}
                    matchId={m.matchId}
                    courts={courts}
                    courtId={m.courtId}
                    courtOrder={localOrders[m.matchId] ?? m.courtOrder}
                    hasOfficialResults={m.hasOfficialResults}
                  />
                </div>
                {showReorder ? (
                  <div className="flex shrink-0 items-center gap-1">
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
                  </div>
                ) : null}
              </div>
            </article>
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
