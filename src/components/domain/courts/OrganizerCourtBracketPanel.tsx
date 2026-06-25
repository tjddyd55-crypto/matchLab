"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import { BoutFormatBadge, PublicSparringUnderVsBadge } from "@/components/domain/shared/BoutFormatBadge";
import { MatchDivisionHeader } from "@/components/domain/shared/MatchDivisionHeader";
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

function courtLabelForMatch(
  m: OrganizerEventMatchListItemVM,
  courts: EventCourtVM[],
): string {
  if (!m.courtId) return "미지정";
  const idx = courts.findIndex((c) => c.id === m.courtId);
  if (idx >= 0) return formatCourtTabLabel(courts[idx]!, idx);
  return m.courtName ?? "경기장";
}

function matchOrderLabel(m: OrganizerEventMatchListItemVM, courtOrder: number | null) {
  if (courtOrder != null) return `제${courtOrder}경기`;
  if (m.matchNumber != null) return `제${m.matchNumber}경기`;
  if (m.globalMatchOrder != null) return `제${m.globalMatchOrder + 1}경기`;
  return `제${m.matchOrder + 1}경기`;
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
  return (
    <div
      className={cn(
        "flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-md border px-3 py-3 text-center text-sm",
        style.bg,
      )}
    >
      <p className={cn(bracketCardTypography.fighterCorner, style.accent)}>{corner}</p>
      <p className={bracketCardTypography.fighterName}>{name}</p>
      <p className={bracketCardTypography.fighterGym}>{gymName ?? "-"}</p>
      <FighterHandicapBadge
        handicap={handicap}
        cornerLabel={corner}
        compact
        className="mt-0.5 items-center"
      />
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

  const canReorder = activeTab !== "all" && filtered.length > 0;

  function move(matchId: string, direction: -1 | 1) {
    const idx = filtered.findIndex((m) => m.matchId === matchId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= filtered.length) return;

    const reordered = [...filtered];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, removed!);

    setOrderOverrides((prev) => {
      const next = { ...prev };
      reordered.forEach((m, i) => {
        next[m.matchId] = i + 1;
      });
      return next;
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
          {filtered.map((m, idx) => {
            const ops = parseMatchOperationalSettings(m.resultMemo).settings;
            const order = localOrders[m.matchId] ?? m.courtOrder;
            const formatKind = resolveBoutFormatKind({
              bracketType: m.bracketType,
              bracketIsPublic: m.bracketIsPublic,
              matchIsPublicSparring: m.matchIsPublicSparring,
              resultMemo: m.resultMemo,
            });
            return (
            <article
              key={m.matchId}
              className="overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-primary/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                <div className="min-w-0 flex-1">
                  {m.division ? (
                    <MatchDivisionHeader
                      matchNumberLabel={matchOrderLabel(m, order)}
                      division={m.division}
                      trailing={
                        <>
                          {formatKind !== "public_sparring" ? (
                            <BoutFormatBadge
                              bracketType={m.bracketType}
                              bracketIsPublic={m.bracketIsPublic}
                              matchIsPublicSparring={m.matchIsPublicSparring}
                              resultMemo={m.resultMemo}
                              className={bracketCardTypography.formatBadge}
                            />
                          ) : null}
                          <span
                            className={cn(
                              bracketCardTypography.opsPill,
                              "text-muted-foreground",
                            )}
                          >
                            {formatOperationalSettingsLabel(ops)}
                          </span>
                        </>
                      }
                      meta={
                        <>
                          {courtLabelForMatch(m, courts)}
                          {order != null ? ` · ${order}경기` : ""}
                          {m.roundName ? ` · ${m.roundName}` : ""}
                        </>
                      }
                    />
                  ) : (
                    <>
                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-2",
                          bracketCardTypography.headerRow,
                        )}
                      >
                        <span className={bracketCardTypography.matchNumber}>
                          {matchOrderLabel(m, order)}
                        </span>
                        <span className={bracketCardTypography.division}>
                          {m.divisionLabel ?? MATCH_CATEGORY_LABEL}
                        </span>
                        {formatKind !== "public_sparring" ? (
                          <BoutFormatBadge
                            bracketType={m.bracketType}
                            bracketIsPublic={m.bracketIsPublic}
                            matchIsPublicSparring={m.matchIsPublicSparring}
                            resultMemo={m.resultMemo}
                            className={bracketCardTypography.formatBadge}
                          />
                        ) : null}
                        <span
                          className={cn(
                            bracketCardTypography.opsPill,
                            "text-muted-foreground",
                          )}
                        >
                          {formatOperationalSettingsLabel(ops)}
                        </span>
                      </div>
                      <p className={cn(bracketCardTypography.meta, "mt-1")}>
                        {courtLabelForMatch(m, courts)}
                        {order != null ? ` · ${order}경기` : ""}
                        {m.roundName ? ` · ${m.roundName}` : ""}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canReorder ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        aria-label="경기 순서"
                        className="border-input bg-background h-7 w-14 rounded-md border px-1 text-xs"
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
                  <MatchStatusBadge status={m.status} size="md" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
                <OrganizerFighterSlot
                  corner="홍코너"
                  name={m.fighterRed?.name ?? "-"}
                  gymName={m.fighterRed?.gymName ?? null}
                  handicap={m.fighterRed?.handicap ?? null}
                />
                <div className="bg-muted/20 flex flex-col items-center justify-center px-4 py-3 md:min-w-[4.5rem] md:py-4">
                  <span className={bracketCardTypography.vs}>VS</span>
                  <PublicSparringUnderVsBadge
                    bracketType={m.bracketType}
                    bracketIsPublic={m.bracketIsPublic}
                    matchIsPublicSparring={m.matchIsPublicSparring}
                    resultMemo={m.resultMemo}
                  />
                </div>
                <OrganizerFighterSlot
                  corner="청코너"
                  name={m.fighterBlue?.name ?? "-"}
                  gymName={m.fighterBlue?.gymName ?? null}
                  handicap={m.fighterBlue?.handicap ?? null}
                />
              </div>

              <div className="border-t px-3 py-2">
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
            );
          })}
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
