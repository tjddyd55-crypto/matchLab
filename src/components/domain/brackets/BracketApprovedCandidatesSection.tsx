"use client";

import { useMemo } from "react";
import type {
  OrganizerApprovedFighterOptionVM,
  OrganizerBracketMatchVM,
} from "@/lib/services/bracket.service";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { cn } from "@/lib/utils";

type PlacementInfo = {
  matchLabel: string;
  corner: "홍코너" | "청코너";
  opponentName: string;
};

function buildPlacementMap(
  matches: OrganizerBracketMatchVM[],
): Map<string, PlacementInfo> {
  const map = new Map<string, PlacementInfo>();
  for (const m of matches) {
    const matchLabel = formatMatchOrderFormal(m);
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

type CandidateGroup = "assigned" | "unassignable" | "unassigned";

/**
 * 후보 분류 우선순위:
 * 1) 배치 불가(실격·취소·미출석 등) → 참여 불가
 * 2) 대진에 이미 배정됨 → 배정된 선수
 * 3) 그 외(출전 가능·미배정) → 미배정 선수
 * 배치 가능 여부는 bracket.service의 computeBracketAssignability(SSOT) 결과를 그대로 사용한다.
 */
function classifyCandidate(
  option: OrganizerApprovedFighterOptionVM,
  isPlaced: boolean,
): CandidateGroup {
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
  placement: PlacementInfo | undefined;
  isPlaced: boolean;
  group: CandidateGroup;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-sm",
        group === "unassignable"
          ? "border-destructive/40"
          : group === "unassigned" && !option.isEligibleForBracket
            ? "border-amber-500/40"
            : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{option.fighterName}</div>
          <div className="text-muted-foreground truncate text-xs">
            {option.gymName}
          </div>
          <div className="mt-1">
            <DivisionCompactDisplay
              division={option.division}
              mainClassName="text-xs"
              secondaryClassName="text-[11px]"
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <EligibilityBadge
            label={option.assignabilityLabel}
            isEligible={option.isAssignableForBracket}
            title={
              option.assignabilityDisabledReason ??
              option.assignabilityWarningReason ??
              option.eligibilityReason
            }
          />
        </div>
      </div>

      <div className="text-muted-foreground border-t pt-2 text-xs">
        {group === "unassignable" ? (
          <p className="leading-snug">
            <span className="font-medium text-destructive">
              {option.assignabilityDisabledReason ?? "대진 배치 불가"}
            </span>
            {isPlaced && placement ? (
              <span className="text-amber-700 dark:text-amber-300">
                {" · "}
                {placement.matchLabel} 배정됨 — 슬롯을 비우거나 교체해 주세요.
              </span>
            ) : null}
          </p>
        ) : placement ? (
          <p>
            <span className="text-foreground font-medium">
              {placement.matchLabel} {placement.corner}
            </span>
            {" · "}상대 {placement.opponentName}
          </p>
        ) : (
          <p className="font-medium text-amber-800 dark:text-amber-200">
            대진 대기
          </p>
        )}
      </div>
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
    <div className="min-w-0 space-y-2.5">
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
        <ul className="grid gap-2">{children}</ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
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
    <section className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">승인된 신청 선수 (대진 후보)</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          승인된 신청자를 배정된 선수 · 참여 불가 선수 · 미배정 선수로 나누어
          표시합니다. 실격·경기취소 등 출전 불가 선수는 배치할 수 없습니다.
        </p>
      </div>

      {unassignablePlacedCount > 0 ? (
        <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm">
          <p className="font-medium text-destructive">
            대진표에 배치된 선수 중 출전 불가 상태인 선수가{" "}
            {unassignablePlacedCount}명 있습니다.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            아래 참여 불가 선수 영역에서 확인 후 슬롯을 비우거나 다른 선수로
            교체해 주세요.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3 lg:gap-5">
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
    </section>
  );
}
