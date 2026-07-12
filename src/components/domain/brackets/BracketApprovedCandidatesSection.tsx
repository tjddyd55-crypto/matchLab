"use client";

import { useMemo } from "react";
import type {
  OrganizerApprovedFighterOptionVM,
  OrganizerBracketMatchVM,
} from "@/lib/services/bracket.service";
import {
  BracketFighterCompactBadge,
  BracketFighterCompactCard,
} from "@/components/domain/brackets/BracketFighterCompactCard";
import {
  buildCandidateMetaLine,
  resolveCandidateStatusBadge,
  type BracketCandidateGroup,
  type BracketFighterPlacementMeta,
} from "@/lib/bracket-fighter-compact-display";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import { cn } from "@/lib/utils";

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
  const metaLine = buildCandidateMetaLine(group, placement, isPlaced);

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
        metaLine={metaLine}
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

function CandidateColumn({
  title,
  count,
  accentClassName,
  emptyMessage,
  children,
}: {
  title: string;
  count: number;
  accentClassName?: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <h3 className="flex items-center gap-2 border-b pb-2 text-sm font-semibold">
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
      {count > 0 ? (
        <ul className="grid gap-1.5">{children}</ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-center text-xs">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

export function BracketApprovedCandidatesSection({
  options,
  matches,
}: {
  options: OrganizerApprovedFighterOptionVM[];
  matches: OrganizerBracketMatchVM[];
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

  const unassignablePlacedCount = grouped.unassignable.filter((o) =>
    placedIds.has(o.fighterId),
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">승인된 신청 선수 (대진 후보)</CardTitle>
        <CardDescription>
          승인된 신청자를 배정된 선수 · 참여 불가 선수 · 미배정 선수로 나누어
          표시합니다. 실격·경기취소 등 출전 불가 선수는 배치할 수 없습니다.
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
            title="미배정 선수"
            count={grouped.unassigned.length}
            accentClassName="bg-amber-500/15 text-amber-700 dark:text-amber-300"
            emptyMessage="미배정 선수가 없습니다."
          >
            {grouped.unassigned.map((o) => (
              <CandidateCard
                key={o.applicationId}
                option={o}
                placement={undefined}
                isPlaced={false}
                group="unassigned"
              />
            ))}
          </CandidateColumn>
        </div>
      </CardContent>
    </Card>
  );
}
