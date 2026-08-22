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
import {
  buildBracketCandidateWeightRecordDisplay,
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
import { formControlFieldCompactClass } from "@/lib/ui/form-control-ui";
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

function EventWideUnmatchedQuickBar({
  options,
  searchQuery,
  onSearchChange,
  slotIds,
  activePickSlot,
  onCardClick,
  onAssignRed,
  onAssignBlue,
  onDragStart,
}: {
  options: OrganizerApprovedFighterOptionVM[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  slotIds: Set<string>;
  activePickSlot: ManualMatchPickSlot | null;
  onCardClick: (option: OrganizerApprovedFighterOptionVM) => void;
  onAssignRed: (option: OrganizerApprovedFighterOptionVM) => void;
  onAssignBlue: (option: OrganizerApprovedFighterOptionVM) => void;
  onDragStart?: () => void;
}) {
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.fighterName.toLowerCase().includes(q) ||
          o.gymName.toLowerCase().includes(q) ||
          o.currentDivisionLabel.toLowerCase().includes(q) ||
          o.appliedDivisionLabel.toLowerCase().includes(q),
      )
    : options;

  return (
    <section className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">전체 미배정 선수 빠른 배정</h3>
          <p className="text-muted-foreground text-xs">
            다른 경기구분 포함 · Match 미배정 선수만 ({options.length}명)
          </p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
            선수의 홍코너·청코너 버튼을 누르면 수동 경기 만들기가 열립니다. 두
            선수를 확인한 뒤 [경기 생성]을 눌러주세요.
          </p>
        </div>
        <input
          className={cn(formControlFieldCompactClass, "max-w-xs")}
          placeholder="선수명 · 체육관 · 경기구분"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {activePickSlot ? (
        <p className="text-primary text-xs font-medium">
          {activePickSlot === "red" ? "홍코너" : "청코너"} 선택 중 — 아래 선수를
          클릭하세요
        </p>
      ) : null}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded border border-dashed px-3 py-2 text-center text-xs">
          검색 결과가 없습니다.
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {filtered.map((o) => {
            const inSlot = slotIds.has(o.fighterId);
            const statusBadge = resolveCandidateStatusBadge(o);
            const weightRecordStats = buildBracketCandidateWeightRecordDisplay(o);
            return (
              <UnmatchedDraggableCardShell
                key={o.applicationId}
                fighterId={o.fighterId}
                inSlot={inSlot}
                onDragStart={onDragStart}
              >
                <button
                  type="button"
                  className={cn(
                    "min-w-[240px] max-w-[280px] text-left",
                    activePickSlot && !inSlot ? "cursor-pointer" : undefined,
                  )}
                  onClick={() => {
                    if (inSlot) return;
                    onCardClick(o);
                  }}
                >
                  <BracketFighterCompactCard
                    fighterName={o.fighterName}
                    gymName={o.gymName}
                    metaLine={candidateDivisionMeta(o)}
                    weightRecordStats={weightRecordStats}
                    statusBadges={
                      <div className="flex flex-wrap items-center gap-1">
                        {o.isOtherDivision ? (
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
                {!inSlot ? (
                  <div className="mt-1 flex gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="flex-1"
                      aria-label={`${o.fighterName} 홍코너에 배정`}
                      onClick={() => onAssignRed(o)}
                    >
                      홍
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="flex-1"
                      aria-label={`${o.fighterName} 청코너에 배정`}
                      onClick={() => onAssignBlue(o)}
                    >
                      청
                    </Button>
                  </div>
                ) : null}
              </UnmatchedDraggableCardShell>
            );
          })}
        </ul>
      )}
    </section>
  );
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
  onCardClick,
  onAssignRed,
  onAssignBlue,
  onDragStart,
}: {
  option: OrganizerApprovedFighterOptionVM;
  inSlot: boolean;
  showDivisionLine?: boolean;
  activePickSlot?: ManualMatchPickSlot | null;
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
              [divisionLine, inSlot ? "배치 중" : null]
                .filter(Boolean)
                .join(" · ") || undefined
            }
            weightRecordStats={weightRecordStats}
            statusBadges={
              <div className="flex flex-wrap items-center gap-1">
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
}: {
  title: string;
  count: number;
  accentClassName?: string;
  emptyMessage: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="space-y-2 border-b pb-2">
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
}) {
  const placementMap = useMemo(() => buildPlacementMap(matches), [matches]);
  const placedIds = useMemo(() => new Set(placementMap.keys()), [placementMap]);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [quickBarSearch, setQuickBarSearch] = useState("");
  const [activePickSlot, setActivePickSlot] = useState<ManualMatchPickSlot | null>(
    null,
  );
  const [dockExpanded, setDockExpanded] = useState(false);
  const { alert } = useAppConfirmDialog();

  const expandDock = useCallback(() => setDockExpanded(true), []);

  const manualCandidateMap = useMemo(() => {
    const map = new Map<string, OrganizerApprovedFighterOptionVM>();
    for (const o of grouped.unassigned) map.set(o.fighterId, o);
    for (const o of eventWideUnmatchedOptions) map.set(o.fighterId, o);
    return map;
  }, [grouped.unassigned, eventWideUnmatchedOptions]);

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

  const filteredEventWide = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = eventWideUnmatchedOptions;
    if (q) {
      list = list.filter(
        (o) =>
          o.fighterName.toLowerCase().includes(q) ||
          o.gymName.toLowerCase().includes(q) ||
          o.currentDivisionLabel.toLowerCase().includes(q),
      );
    }
    return sortByAnchorWeight(list, anchorWeight);
  }, [anchorWeight, eventWideUnmatchedOptions, searchQuery]);

  const visibleUnmatched =
    unmatchedTab === "division" ? grouped.unassigned : filteredEventWide;
  const visibleUnmatchedCount =
    unmatchedTab === "division"
      ? grouped.unassigned.length
      : eventWideUnmatchedOptions.length;

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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">승인된 신청 선수 (대진 후보)</CardTitle>
          <CardDescription>
            승인된 신청자를 배정된 선수 · 참여 불가 선수 · 미매칭 선수로
            나누어 표시합니다. 전체 미매칭에서는 다른 경기구분 선수도 조회할 수
            있습니다.
          </CardDescription>
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
        {unassignablePlacedCount > 0 ? (
          <FeedbackMessage tone="error" role="alert">
            대진표에 배치된 선수 중 출전 불가 상태인 선수가{" "}
            {unassignablePlacedCount}명 있습니다. 참여 불가 선수 영역에서 확인 후
            슬롯을 비우거나 다른 선수로 교체해 주세요.
          </FeedbackMessage>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
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

          <CandidateColumn
            title="미매칭 선수"
            count={visibleUnmatchedCount}
            accentClassName="bg-amber-500/15 text-amber-700 dark:text-amber-300"
            emptyMessage={
              unmatchedTab === "division"
                ? "현재 경기구분 미매칭 선수가 없습니다."
                : "대회 전체 미매칭 선수가 없습니다."
            }
            headerExtra={
              showManualCreate ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
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
                  </div>
                  {unmatchedTab === "event" ? (
                    <input
                      className={formControlFieldCompactClass}
                      placeholder="선수명 · 체육관 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  ) : null}
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
          </CandidateColumn>
        </div>

        {showManualCreate && eventWideUnmatchedOptions.length > 0 ? (
          <EventWideUnmatchedQuickBar
            options={eventWideUnmatchedOptions}
            searchQuery={quickBarSearch}
            onSearchChange={setQuickBarSearch}
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
