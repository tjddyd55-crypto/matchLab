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
import {
  formatCourtScheduleMatchOrderShort,
  sortMatchesByCourtSchedule,
} from "@/lib/court-match-order";
import { MatchonTabs } from "@/components/shared/MatchonTabs";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizerBracketViewMatchCard } from "@/components/domain/brackets/OrganizerBracketViewMatchCard";
import { BracketViewFilterToolbar } from "@/components/domain/brackets/BracketViewFilterToolbar";
import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import {
  DEFAULT_BRACKET_VIEW_FILTERS,
  filterBracketViewMatches,
  hasActiveBracketViewFilters,
  type BracketViewFilterState,
} from "@/lib/brackets/bracket-view-filters";
import { resolveBoutFormatKind } from "@/lib/bout-format";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type {
  OrganizerEventMatchListItemVM,
  OrganizerEventMatchFighterVM,
} from "@/lib/services/match.service";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
import { cn } from "@/lib/utils";

const selectClass =
  "border-input bg-background h-10 rounded-md border px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
): string {
  return formatCourtScheduleMatchOrderShort(m);
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
    <div className={cn("flex w-full min-w-0 justify-center rounded-md border px-3 py-3", style.bg)}>
      <BracketFighterCompactCard
        centerIdentity
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
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const [orderOverrides, setOrderOverrides] = useState<
    Record<string, number | null>
  >({});
  const [viewFilters, setViewFilters] = useState<BracketViewFilterState>(
    DEFAULT_BRACKET_VIEW_FILTERS,
  );

  const serverOrders = useMemo(() => {
    const init: Record<string, number | null> = {};
    for (const m of matches) init[m.matchId] = m.courtOrder;
    return init;
  }, [matches]);

  const localOrders = useMemo(
    () => ({ ...serverOrders, ...orderOverrides }),
    [serverOrders, orderOverrides],
  );

  /** 경기장 탭 필터 — 순서 조정 SSOT */
  const courtTabMatches = useMemo(() => {
    const sorted = sortMatchesForTab(matches, activeCourts);
    if (activeTab === "all") return sorted;
    return sorted.filter((m) => m.courtId === activeTab);
  }, [matches, activeTab, activeCourts]);

  /** 읽기 전용 보기 필터 — hide/show만, 순서/저장 무관 */
  const filtered = useMemo(
    () => filterBracketViewMatches(courtTabMatches, viewFilters),
    [courtTabMatches, viewFilters],
  );

  const viewFiltersActive = hasActiveBracketViewFilters(viewFilters);

  const courtTabItems = useMemo(
    () => [
      { id: "all" as CourtTabId, label: "전체" },
      ...activeCourts.map((c, idx) => ({
        id: c.id as CourtTabId,
        label: formatCourtTabLabel(c, idx),
      })),
    ],
    [activeCourts],
  );

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
    // 보기 필터와 무관하게 해당 경기장 전체 순서로 재정렬
    return courtTabMatches.filter((x) => x.courtId === courtId);
  }

  function canShowReorderControls(m: OrganizerEventMatchListItemVM): boolean {
    if (viewFiltersActive) return false;
    const courtId = reorderCourtIdForMatch(m);
    if (!courtId) return false;
    return courtMatchesForReorder(m).length > 1;
  }

  function moveAndSave(matchId: string, direction: -1 | 1) {
    if (pending) return;
    if (viewFiltersActive) return;
    const match = courtTabMatches.find((m) => m.matchId === matchId);
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
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      setFeedback({ tone: "success", message: "순서가 저장되었습니다." });
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
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      setFeedback({ tone: "success", message: "순서가 저장되었습니다." });
      setOrderOverrides({});
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <MatchonTabs
        items={courtTabItems}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      <BracketViewFilterToolbar
        matches={courtTabMatches}
        filters={viewFilters}
        onFiltersChange={setViewFilters}
        visibleCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <BracketsEmptyState
          message={
            viewFiltersActive
              ? "조건에 맞는 대진이 없습니다."
              : "조건에 맞는 경기가 없습니다."
          }
        />
      ) : (
        <>
          <div className="hidden flex-col gap-2 md:flex">
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
              const headerBadges = (
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
              );
              const controls = (
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
                    <span className="text-foreground bg-muted/50 inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold tabular-nums tracking-tight whitespace-nowrap">
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
                          className={cn(selectClass, "h-10 w-16 text-xs")}
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
                          className="h-10 w-10 shrink-0 p-0 text-base font-bold disabled:opacity-40"
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
                          className="h-10 w-10 shrink-0 p-0 text-base font-bold disabled:opacity-40"
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
              );

              return (
                <BracketMatchCompactRow
                  key={m.matchId}
                  matchOrderLabel={resolveCourtMatchOrderLabel(m)}
                  divisionHint={m.divisionLabel}
                  statusArea={
                    <MatchonStatusBadge
                      status={resolveBracketMatchMatchonStatus(m.status)}
                      label={getBracketMatchMatchonLabel(m.status)}
                      size="sm"
                    />
                  }
                  redSlot={
                    <CourtBracketFighterCell
                      corner="홍코너"
                      name={m.fighterRed?.name ?? ""}
                      gymName={m.fighterRed?.gymName ?? null}
                      handicap={m.fighterRed?.handicap ?? null}
                    />
                  }
                  center={
                    <BracketMatchCenterCell badges={headerBadges} />
                  }
                  blueSlot={
                    <CourtBracketFighterCell
                      corner="청코너"
                      name={m.fighterBlue?.name ?? ""}
                      gymName={m.fighterBlue?.gymName ?? null}
                      handicap={m.fighterBlue?.handicap ?? null}
                    />
                  }
                  controls={controls}
                />
              );
            })}
          </div>

          <div className="flex flex-col gap-3 md:hidden">
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
                <OrganizerBracketViewMatchCard
                  key={`${m.matchId}-mobile`}
                  matchOrderLabel={resolveCourtMatchOrderLabel(m)}
                  divisionLabel={m.divisionLabel}
                  bracketTitle={m.bracketTitle}
                  courtName={m.courtName}
                  status={m.status}
                  winnerId={m.winnerId}
                  fighterRedId={m.fighterRed?.id ?? null}
                  fighterRedName={m.fighterRed?.name ?? "-"}
                  fighterRedGym={m.fighterRed?.gymName ?? null}
                  fighterRedHandicap={m.fighterRed?.handicap ?? null}
                  fighterBlueId={m.fighterBlue?.id ?? null}
                  fighterBlueName={m.fighterBlue?.name ?? "-"}
                  fighterBlueGym={m.fighterBlue?.gymName ?? null}
                  fighterBlueHandicap={m.fighterBlue?.handicap ?? null}
                  opsLabel={formatOperationalSettingsLabel(ops)}
                  headerBadges={
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
                  controls={
                    <>
                      <MatchCourtControls
                        key={`${m.matchId}-m:${m.courtId ?? ""}`}
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
                      {showReorder ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            aria-label="경기 순서"
                            className={cn(selectClass, "w-20")}
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
                            size="default"
                            variant="outline"
                            className="flex-1"
                            disabled={courtIdx <= 0 || pending}
                            onClick={() => moveAndSave(m.matchId, -1)}
                          >
                            위로
                          </Button>
                          <Button
                            type="button"
                            size="default"
                            variant="outline"
                            className="flex-1"
                            disabled={
                              courtIdx < 0 ||
                              courtIdx >= courtMatches.length - 1 ||
                              pending
                            }
                            onClick={() => moveAndSave(m.matchId, 1)}
                          >
                            아래로
                          </Button>
                        </div>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>
        </>
      )}

      {showOrderSection && matches.length > 0 ? (
        <Card variant="muted" className="py-4">
          <CardContent className="flex flex-col gap-3 px-4">
            {canReorderOnTab ? (
              <Button
                type="button"
                size="default"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={saveOrder}
              >
                {pending ? "저장 중…" : "이 경기장 순서 저장"}
              </Button>
            ) : (
              <FeedbackMessage tone="info">
                경기장 탭(1경기장, 2경기장 등)을 선택하면 해당 경기장 경기 순서를
                조정할 수 있습니다.
              </FeedbackMessage>
            )}
            {feedback ? (
              <FeedbackMessage tone={feedback.tone}>{feedback.message}</FeedbackMessage>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
