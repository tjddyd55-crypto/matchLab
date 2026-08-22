"use client";

import { useEffect, useMemo, useState } from "react";
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
  type ManualMatchSlotAthlete,
} from "@/components/domain/brackets/ManualMatchCreatePanel";
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

function candidateExtraMeta(option: OrganizerApprovedFighterOptionVM): string {
  const parts: string[] = [];
  if (option.recordSummary) {
    parts.push(option.recordSummary.replace(/\s+/g, ""));
  }
  if (option.applicationWeightKg != null) {
    parts.push(`${option.applicationWeightKg}kg`);
  }
  return parts.join(" · ");
}

function athleteFromOption(
  option: OrganizerApprovedFighterOptionVM,
): ManualMatchSlotAthlete {
  return {
    fighterId: option.fighterId,
    applicationId: option.applicationId,
    fighterName: option.fighterName,
    gymName: option.gymName,
    label: option.label,
    recordSummary: option.recordSummary,
    applicationWeightKg: option.applicationWeightKg,
  };
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
  const extra = candidateExtraMeta(option);
  const metaLine = [placementMeta, extra].filter(Boolean).join(" · ");

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
        metaLine={metaLine || undefined}
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
  onMobilePair,
  mobilePairLabel,
}: {
  option: OrganizerApprovedFighterOptionVM;
  inSlot: boolean;
  showDivisionLine?: boolean;
  onMobilePair?: () => void;
  mobilePairLabel?: string;
}) {
  const statusBadge = resolveCandidateStatusBadge(option);
  const extra = candidateExtraMeta(option);
  const divisionLine = showDivisionLine ? option.currentDivisionLabel : null;
  const appliedDiffers =
    showDivisionLine &&
    option.appliedDivisionLabel !== option.currentDivisionLabel;

  return (
    <UnmatchedDraggableCardShell fighterId={option.fighterId} inSlot={inSlot}>
      <div className="space-y-1">
        <BracketFighterCompactCard
          fighterName={option.fighterName}
          gymName={option.gymName}
          metaLine={
            [
              divisionLine,
              extra,
              inSlot ? "배치 중" : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
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
        {appliedDiffers ? (
          <p className="text-muted-foreground text-[11px]">
            신청: {option.appliedDivisionLabel}
          </p>
        ) : null}
        {onMobilePair ? (
          <Button
            type="button"
            size="xs"
            variant="secondary"
            className="mt-1 w-full md:hidden"
            onClick={onMobilePair}
          >
            {mobilePairLabel ?? "이 선수와 매칭"}
          </Button>
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

  function mobilePairHandler(option: OrganizerApprovedFighterOptionVM) {
    if (slotIds.has(option.fighterId)) return undefined;
    const anchor = red ?? blue;
    if (!anchor) return undefined;
    return () => {
      const athlete = athleteFromOption(option);
      if (red && !blue && red.fighterId !== option.fighterId) {
        setBlue(athlete);
        return;
      }
      if (blue && !red && blue.fighterId !== option.fighterId) {
        setRed(athlete);
      }
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">승인된 신청 선수 (대진 후보)</CardTitle>
        <CardDescription>
          승인된 신청자를 배정된 선수 · 참여 불가 선수 · 미매칭 선수로
          나누어 표시합니다. 전체 미매칭에서는 다른 경기구분 선수도 조회할 수
          있습니다.
        </CardDescription>
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
            footer={
              showManualCreate ? (
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
                />
              ) : null
            }
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
                  onMobilePair={mobilePairHandler(o)}
                />
              );
            })}
          </CandidateColumn>
        </div>
      </CardContent>
    </Card>
  );
}
