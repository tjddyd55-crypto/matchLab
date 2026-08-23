"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  OrganizerApprovedFighterOptionVM,
  OrganizerBracketMatchVM,
} from "@/lib/services/bracket.service";
import {
  BracketFighterCompactBadge,
  BracketFighterCompactCard,
} from "@/components/domain/brackets/BracketFighterCompactCard";
import {
  ManualMatchCreatePanel,
  UnmatchedDraggableCardShell,
  formatManualMatchSelectionHint,
  useManualMatchPlaceAthlete,
  type ManualMatchPickSlot,
  type ManualMatchSlotAthlete,
} from "@/components/domain/brackets/ManualMatchCreatePanel";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { EventWideUnmatchedQuickBar } from "@/components/domain/brackets/EventWideUnmatchedQuickBar";
import { UnmatchedQuickBarFilterToolbar } from "@/components/domain/brackets/UnmatchedQuickBarFilterToolbar";
import {
  buildBracketCandidateWeightRecordDisplay,
  buildFighterAssignmentMap,
  getFighterAssignments,
} from "@/lib/bracket-fighter-assignment";
import {
  buildCandidateMetaLine,
  resolveCandidateStatusBadge,
  type BracketCandidateGroup,
  type BracketFighterPlacementMeta,
} from "@/lib/bracket-fighter-compact-display";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  filterUnmatchedQuickBarOptions,
  hasActiveUnmatchedQuickBarFilters,
  type UnmatchedQuickBarFilterState,
} from "@/lib/brackets/unmatched-candidate-filters";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import { BracketType } from "@/lib/enums";
import { cn } from "@/lib/utils";

type UnmatchedTab = "division" | "event";

function buildPlacementMap(
  matches: OrganizerBracketMatchVM[],
): Map<string, BracketFighterPlacementMeta> {
  const map = new Map<string, BracketFighterPlacementMeta>();
  for (const m of matches) {
    const matchLabel = formatMatchOrderShort(m);
    if (m.fighterRedId) {
      map.set(m.fighterRedId, {
        matchLabel,
        corner: "홍코너",
        opponentName: m.fighterBlueSnapshot?.name ?? "미배정",
      });
    }
    if (m.fighterBlueId) {
      map.set(m.fighterBlueId, {
        matchLabel,
        corner: "청코너",
        opponentName: m.fighterRedSnapshot?.name ?? "미배정",
      });
    }
  }
  return map;
}

function classifyCandidate(
  option: OrganizerApprovedFighterOptionVM,
  isPlaced: boolean,
): BracketCandidateGroup {
  if (!option.isAssignableForBracket) return "unassignable";
  if (isPlaced) return "assigned";
  return "unassigned";
}

function candidateDivisionMeta(
  option: OrganizerApprovedFighterOptionVM,
): string | undefined {
  const label = option.isOtherDivision
    ? option.currentDivisionLabel
    : option.appliedDivisionLabel;
  return label || undefined;
}

function sortByAnchorWeight(
  list: OrganizerApprovedFighterOptionVM[],
  anchorKg: number | null,
): OrganizerApprovedFighterOptionVM[] {
  if (anchorKg == null) return list;
  return [...list].sort((a, b) => {
    const da =
      a.applicationWeightKg != null
        ? Math.abs(a.applicationWeightKg - anchorKg)
        : Number.POSITIVE_INFINITY;
    const db =
      b.applicationWeightKg != null
        ? Math.abs(b.applicationWeightKg - anchorKg)
        : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.fighterName.localeCompare(b.fighterName, "ko");
  });
}

function CandidateCard({
  option,
  placement,
  isPlaced,
  group,
}: {
  option: OrganizerApprovedFighterOptionVM;
  placement: BracketFighterPlacementMeta | undefined;
  isPlaced: boolean;
  group: BracketCandidateGroup;
}) {
  const statusBadge = resolveCandidateStatusBadge(option);
  const placementMeta = buildCandidateMetaLine(group, placement, isPlaced);
  const weightRecordStats = buildBracketCandidateWeightRecordDisplay(option);

  return (
    <li
      className={cn(
        "rounded-lg border bg-muted/20 px-2 py-1.5",
        group === "assigned" && "border-primary/30 bg-primary/5",
        group === "unassignable"
          ? "border-destructive/40"
          : group === "unassigned" && !option.isEligibleForBracket
            ? "border-amber-500/40"
            : undefined,
      )}
    >
      <BracketFighterCompactCard
        fighterName={option.fighterName}
        gymName={option.gymName}
        metaLine={placementMeta || undefined}
        weightRecordStats={weightRecordStats}
        statusBadges={
          <BracketFighterCompactBadge
            label={statusBadge.label}
            variant={statusBadge.variant}
            title={statusBadge.title}
          />
        }
      />
    </li>
  );
}

function UnmatchedOptionCard({
  option,
  inSlot,
  showDivisionLine = false,
  activePickSlot,
  assignmentBadge,
  onCardClick,
  onAssignRed,
  onAssignBlue,
  onDragStart,
}: {
  option: OrganizerApprovedFighterOptionVM;
  inSlot: boolean;
  showDivisionLine?: boolean;
  activePickSlot?: ManualMatchPickSlot | null;
  assignmentBadge?: string | null;
  onCardClick?: () => void;
  onAssignRed?: () => void;
  onAssignBlue?: () => void;
  onDragStart?: () => void;
}) {
  const statusBadge = resolveCandidateStatusBadge(option);
  const weightRecordStats = buildBracketCandidateWeightRecordDisplay(option);
  const divisionLine = showDivisionLine ? option.currentDivisionLabel : null;
  const appliedDiffers =
    showDivisionLine &&
    option.appliedDivisionLabel !== option.currentDivisionLabel;

  return (
    <UnmatchedDraggableCardShell
      fighterId={option.fighterId}
      inSlot={inSlot}
      onDragStart={onDragStart}
    >
      <div className="space-y-1">
        <button
          type="button"
          className={cn(
            "w-full text-left",
            activePickSlot && !inSlot ? "cursor-pointer rounded ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary" : undefined,
          )}
          onClick={() => {
            if (inSlot) return;
            onCardClick?.();
          }}
        >
          <BracketFighterCompactCard
            fighterName={option.fighterName}
            gymName={option.gymName}
            metaLine={
              [divisionLine, assignmentBadge, inSlot ? "배치 중" : null]
                .filter(Boolean)
                .join(" · ") || undefined
            }
            weightRecordStats={weightRecordStats}
            statusBadges={
              <div className="flex flex-wrap items-center gap-1">
                {assignmentBadge ? (
                  <BracketFighterCompactBadge
                    label={assignmentBadge}
                    variant="warning"
                  />
                ) : null}
                {option.isOtherDivision ? (
                  <BracketFighterCompactBadge
                    label="다른 경기구분"
                    variant="warning"
                  />
                ) : null}
                <BracketFighterCompactBadge
                  label={statusBadge.label}
                  variant={statusBadge.variant}
                  title={statusBadge.title}
                />
              </div>
            }
          />
        </button>
        {appliedDiffers ? (
          <p className="text-muted-foreground text-[11px]">
            신청: {option.appliedDivisionLabel}
          </p>
        ) : null}
        {!inSlot && (onAssignRed || onAssignBlue) ? (
          <div className="flex gap-1">
            {onAssignRed ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="flex-1"
                aria-label={`${option.fighterName} 홍코너에 배정`}
                onClick={onAssignRed}
              >
                홍코너
              </Button>
            ) : null}
            {onAssignBlue ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="flex-1"
                aria-label={`${option.fighterName} 청코너에 배정`}
                onClick={onAssignBlue}
              >
                청코너
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </UnmatchedDraggableCardShell>
  );
}

function CandidateColumn({
  title,
  count,
  accentClassName,
  emptyMessage,
  children,
  footer,
  headerExtra,
  className,
}: {
  title?: string;
  count: number;
  accentClassName?: string;
  emptyMessage: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="space-y-2 border-b pb-2">
        {title ? (
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span>{title}</span>
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                accentClassName ?? "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          </h3>
        ) : (
          <p className="text-muted-foreground text-xs tabular-nums">
            표시 {count}명
          </p>
        )}
        {headerExtra}
      </div>
      {count > 0 ? (
        <ul className="grid gap-1.5">{children}</ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-center text-xs">
          {emptyMessage}
        </p>
      )}
      {footer}
    </div>
  );
}

export function BracketApprovedCandidatesSection({
  options,
  eventWideUnmatchedOptions,
  matches,
  bracketId,
  bracketType,
  defaultCourtId,
  targetDivisionId,
  targetDivisionLabel,
  targetDivisionGender,
  variant = "default",
}: {
  options: OrganizerApprovedFighterOptionVM[];
  eventWideUnmatchedOptions: OrganizerApprovedFighterOptionVM[];
  matches: OrganizerBracketMatchVM[];
  bracketId: string;
  bracketType: BracketType;
  defaultCourtId?: string;
  targetDivisionId: string | null;
  targetDivisionLabel: string | null;
  targetDivisionGender?: string | null;
  /** workspace: 그룹 상세 오른쪽 — 미매칭만 */
  variant?: "default" | "workspace";
}) {
  const placementMap = useMemo(() => buildPlacementMap(matches), [matches]);
  const placedIds = useMemo(() => new Set(placementMap.keys()), [placementMap]);
  const assignmentMap = useMemo(
    () => buildFighterAssignmentMap(matches),
    [matches],
  );

  const grouped = useMemo(() => {
    const assigned: OrganizerApprovedFighterOptionVM[] = [];
    const unassignable: OrganizerApprovedFighterOptionVM[] = [];
    const unassigned: OrganizerApprovedFighterOptionVM[] = [];
    for (const o of options) {
      const group = classifyCandidate(o, placedIds.has(o.fighterId));
      if (group === "assigned") assigned.push(o);
      else if (group === "unassignable") unassignable.push(o);
      else unassigned.push(o);
    }
    return { assigned, unassignable, unassigned };
  }, [options, placedIds]);

  const [red, setRed] = useState<ManualMatchSlotAthlete | null>(null);
  const [blue, setBlue] = useState<ManualMatchSlotAthlete | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [unmatchedTab, setUnmatchedTab] = useState<UnmatchedTab>("division");
  const [unmatchedFilters, setUnmatchedFilters] =
    useState<UnmatchedQuickBarFilterState>(DEFAULT_UNMATCHED_QUICK_BAR_FILTERS);
  const [activePickSlot, setActivePickSlot] = useState<ManualMatchPickSlot | null>(
    null,
  );
  const [dockExpanded, setDockExpanded] = useState(false);
  /** 복수 경기 모드 — reload 시 기본 OFF (persist 금지) */
  const [multiMatchMode, setMultiMatchMode] = useState(false);
  const { alert } = useAppConfirmDialog();

  const expandDock = useCallback(() => setDockExpanded(true), []);

  const sameDivisionAssigned = useMemo(
    () =>
      grouped.assigned.filter(
        (o) =>
          o.isAssignableForBracket &&
          (!targetDivisionId || o.divisionId === targetDivisionId),
      ),
    [grouped.assigned, targetDivisionId],
  );

  const manualCandidateMap = useMemo(() => {
    const map = new Map<string, OrganizerApprovedFighterOptionVM>();
    for (const o of grouped.unassigned) map.set(o.fighterId, o);
    for (const o of eventWideUnmatchedOptions) map.set(o.fighterId, o);
    if (multiMatchMode) {
      for (const o of sameDivisionAssigned) map.set(o.fighterId, o);
    }
    return map;
  }, [
    grouped.unassigned,
    eventWideUnmatchedOptions,
    multiMatchMode,
    sameDivisionAssigned,
  ]);

  const manualCandidates = useMemo(
    () => [...manualCandidateMap.values()],
    [manualCandidateMap],
  );

  const unmatchedIds = useMemo(
    () => new Set(manualCandidates.map((o) => o.fighterId)),
    [manualCandidates],
  );

  useEffect(() => {
    if (red && !unmatchedIds.has(red.fighterId)) setRed(null);
    if (blue && !unmatchedIds.has(blue.fighterId)) setBlue(null);
  }, [unmatchedIds, red, blue]);

  const slotIds = useMemo(() => {
    const s = new Set<string>();
    if (red) s.add(red.fighterId);
    if (blue) s.add(blue.fighterId);
    return s;
  }, [red, blue]);

  const anchorWeight = red?.applicationWeightKg ?? blue?.applicationWeightKg ?? null;

  const filteredDivisionUnmatched = useMemo(() => {
    const filtered = filterUnmatchedQuickBarOptions(
      grouped.unassigned,
      unmatchedFilters,
    );
    return sortByAnchorWeight(filtered, anchorWeight);
  }, [anchorWeight, grouped.unassigned, unmatchedFilters]);

  const filteredEventWide = useMemo(() => {
    const filtered = filterUnmatchedQuickBarOptions(
      eventWideUnmatchedOptions,
      unmatchedFilters,
    );
    return sortByAnchorWeight(filtered, anchorWeight);
  }, [anchorWeight, eventWideUnmatchedOptions, unmatchedFilters]);

  const filteredAssignedForMulti = useMemo(() => {
    if (!multiMatchMode) return [];
    const filtered = filterUnmatchedQuickBarOptions(
      sameDivisionAssigned,
      unmatchedFilters,
    );
    return sortByAnchorWeight(filtered, anchorWeight);
  }, [anchorWeight, multiMatchMode, sameDivisionAssigned, unmatchedFilters]);

  const visibleUnmatched =
    unmatchedTab === "division" ? filteredDivisionUnmatched : filteredEventWide;
  const visibleUnmatchedCount = visibleUnmatched.length;
  const unmatchedFiltersActive = hasActiveUnmatchedQuickBarFilters(unmatchedFilters);
  const unmatchedFilterOptionsSource =
    unmatchedTab === "division"
      ? multiMatchMode
        ? [...grouped.unassigned, ...sameDivisionAssigned]
        : grouped.unassigned
      : eventWideUnmatchedOptions;

  const unmatchedEmptyMessage =
    unmatchedFiltersActive && visibleUnmatchedCount === 0
      ? "조건에 맞는 미매칭 선수가 없습니다."
      : unmatchedTab === "division"
        ? "현재 경기구분 미매칭 선수가 없습니다."
        : "대회 전체 미매칭 선수가 없습니다.";

  const unassignablePlacedCount = grouped.unassignable.filter((o) =>
    placedIds.has(o.fighterId),
  ).length;

  const showManualCreate = bracketType === BracketType.match_list;
  const manualMatchSelectionHint = formatManualMatchSelectionHint(red, blue);

  const placeAthlete = useManualMatchPlaceAthlete({
    byId: manualCandidateMap,
    red,
    blue,
    onRedChange: setRed,
    onBlueChange: setBlue,
    onActivePickSlotChange: setActivePickSlot,
    onDockExpand: expandDock,
    alert,
  });

  function assignToSlot(
    slot: ManualMatchPickSlot,
    fighterId: string,
  ) {
    placeAthlete(slot, fighterId);
    expandDock();
  }

  function handleCardPick(option: OrganizerApprovedFighterOptionVM) {
    if (slotIds.has(option.fighterId)) return;
    if (activePickSlot) {
      assignToSlot(activePickSlot, option.fighterId);
      return;
    }
    if (!red) {
      assignToSlot("red", option.fighterId);
      return;
    }
    if (!blue && red.fighterId !== option.fighterId) {
      assignToSlot("blue", option.fighterId);
    }
  }

  const isWorkspace = variant === "workspace";

  return (
    <Card className={cn(isWorkspace && "border-matchon-border shadow-sm")}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">
            {isWorkspace ? "미매칭 선수" : "승인된 신청 선수 (대진 후보)"}
          </CardTitle>
          {!isWorkspace ? (
            <CardDescription>
              승인된 신청자를 배정된 선수 · 참여 불가 선수 · 미매칭 선수로
              나누어 표시합니다. 전체 미매칭에서는 다른 경기구분 선수도 조회할 수
              있습니다.
            </CardDescription>
          ) : (
            <CardDescription>
              검색·필터는 이 영역만 적용됩니다. 왼쪽 잡힌 경기 필터와 독립입니다.
            </CardDescription>
          )}
        </div>
        {showManualCreate && manualCandidates.length > 0 && !dockExpanded ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setDockExpanded(true)}
          >
            수동 경기 만들기
            {manualMatchSelectionHint ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {manualMatchSelectionHint}
              </span>
            ) : null}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isWorkspace && unassignablePlacedCount > 0 ? (
          <FeedbackMessage tone="error" role="alert">
            대진표에 배치된 선수 중 출전 불가 상태인 선수가{" "}
            {unassignablePlacedCount}명 있습니다. 참여 불가 선수 영역에서 확인 후
            슬롯을 비우거나 다른 선수로 교체해 주세요.
          </FeedbackMessage>
        ) : null}

        <div
          className={cn(
            "grid gap-4",
            isWorkspace ? "grid-cols-1" : "lg:grid-cols-3 lg:gap-5",
          )}
        >
          {!isWorkspace ? (
            <>
              <CandidateColumn
                title="배정된 선수"
                count={grouped.assigned.length}
                accentClassName="bg-primary/10 text-primary"
                emptyMessage="대진에 배정된 선수가 없습니다."
              >
                {grouped.assigned.map((o) => (
                  <CandidateCard
                    key={o.applicationId}
                    option={o}
                    placement={placementMap.get(o.fighterId)}
                    isPlaced
                    group="assigned"
                  />
                ))}
              </CandidateColumn>

              <CandidateColumn
                title="참여 불가 선수"
                count={grouped.unassignable.length}
                accentClassName="bg-destructive/10 text-destructive"
                emptyMessage="참여 불가 선수가 없습니다."
              >
                {grouped.unassignable.map((o) => (
                  <CandidateCard
                    key={o.applicationId}
                    option={o}
                    placement={placementMap.get(o.fighterId)}
                    isPlaced={placedIds.has(o.fighterId)}
                    group="unassignable"
                  />
                ))}
              </CandidateColumn>
            </>
          ) : null}

          <CandidateColumn
            title={isWorkspace ? undefined : "미매칭 선수"}
            count={visibleUnmatchedCount}
            accentClassName="bg-amber-500/15 text-amber-700 dark:text-amber-300"
            emptyMessage={unmatchedEmptyMessage}
            className={
              isWorkspace
                ? "max-h-[min(70vh,720px)] overflow-y-auto overscroll-contain"
                : undefined
            }
            headerExtra={
              showManualCreate ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant={
                        unmatchedTab === "division" ? "secondary" : "outline"
                      }
                      onClick={() => setUnmatchedTab("division")}
                    >
                      현재 경기구분 ({grouped.unassigned.length})
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant={
                        unmatchedTab === "event" ? "secondary" : "outline"
                      }
                      onClick={() => setUnmatchedTab("event")}
                    >
                      전체 미매칭 ({eventWideUnmatchedOptions.length})
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant={multiMatchMode ? "default" : "outline"}
                      onClick={() => setMultiMatchMode((v) => !v)}
                    >
                      {multiMatchMode
                        ? "복수 경기 모드 종료"
                        : "복수 경기 선수 추가"}
                    </Button>
                  </div>
                  {multiMatchMode ? (
                    <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-950 dark:text-amber-100">
                      복수 경기 선수 추가 모드 — 이미 배정된 같은 경기구분 선수를
                      추가로 선택할 수 있습니다. 미매칭 인원 수는 변하지 않습니다.
                    </p>
                  ) : null}
                  <UnmatchedQuickBarFilterToolbar
                    layout="stack"
                    options={unmatchedFilterOptionsSource}
                    filters={unmatchedFilters}
                    onFiltersChange={setUnmatchedFilters}
                  />
                  {targetDivisionLabel ? (
                    <p className="text-muted-foreground text-[11px]">
                      이 그룹: {targetDivisionLabel}
                    </p>
                  ) : null}
                </div>
              ) : null
            }
            footer={null}
          >
            {visibleUnmatched.map((o) => {
              const inSlot = slotIds.has(o.fighterId);
              if (!showManualCreate) {
                return (
                  <CandidateCard
                    key={o.applicationId}
                    option={o}
                    placement={undefined}
                    isPlaced={false}
                    group="unassigned"
                  />
                );
              }
              return (
                <UnmatchedOptionCard
                  key={o.applicationId}
                  option={o}
                  inSlot={inSlot}
                  showDivisionLine={unmatchedTab === "event"}
                  activePickSlot={activePickSlot}
                  onCardClick={() => handleCardPick(o)}
                  onAssignRed={() => assignToSlot("red", o.fighterId)}
                  onAssignBlue={() => assignToSlot("blue", o.fighterId)}
                  onDragStart={expandDock}
                />
              );
            })}
            {multiMatchMode && unmatchedTab === "division"
              ? filteredAssignedForMulti.map((o) => {
                  const inSlot = slotIds.has(o.fighterId);
                  const assignments = getFighterAssignments(
                    assignmentMap,
                    o.fighterId,
                  );
                  const badge = `이미 ${assignments.length}경기 배정`;
                  return (
                    <UnmatchedOptionCard
                      key={`multi-${o.applicationId}`}
                      option={o}
                      inSlot={inSlot}
                      assignmentBadge={badge}
                      activePickSlot={activePickSlot}
                      onCardClick={() => handleCardPick(o)}
                      onAssignRed={() => assignToSlot("red", o.fighterId)}
                      onAssignBlue={() => assignToSlot("blue", o.fighterId)}
                      onDragStart={expandDock}
                    />
                  );
                })
              : null}
          </CandidateColumn>
        </div>

        {!isWorkspace &&
        showManualCreate &&
        eventWideUnmatchedOptions.length > 0 ? (
          <EventWideUnmatchedQuickBar
            options={eventWideUnmatchedOptions}
            filters={unmatchedFilters}
            onFiltersChange={setUnmatchedFilters}
            showToolbar
            slotIds={slotIds}
            activePickSlot={activePickSlot}
            onCardClick={handleCardPick}
            onAssignRed={(o) => assignToSlot("red", o.fighterId)}
            onAssignBlue={(o) => assignToSlot("blue", o.fighterId)}
            onDragStart={expandDock}
          />
        ) : null}

        {showManualCreate ? (
          <ManualMatchCreatePanel
            bracketId={bracketId}
            defaultCourtId={defaultCourtId}
            unmatched={manualCandidates}
            matches={matches}
            allowDuplicateAssignment={multiMatchMode}
            targetDivisionId={targetDivisionId}
            targetDivisionLabel={targetDivisionLabel}
            targetDivisionGender={targetDivisionGender}
            red={red}
            blue={blue}
            onRedChange={setRed}
            onBlueChange={setBlue}
            pending={createPending}
            setPendingExternal={setCreatePending}
            activePickSlot={activePickSlot}
            onActivePickSlotChange={setActivePickSlot}
            dockExpanded={dockExpanded}
            onDockExpandedChange={setDockExpanded}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
