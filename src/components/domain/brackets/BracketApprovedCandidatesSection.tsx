"use client";

import { useMemo, useState } from "react";
import type {
  OrganizerApprovedFighterOptionVM,
  OrganizerBracketMatchVM,
} from "@/lib/services/bracket.service";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { Button } from "@/components/ui/button";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

type PlacementInfo = {
  matchLabel: string;
  opponentName: string;
};

function collectPlacedFighterIds(
  matches: OrganizerBracketMatchVM[],
): Set<string> {
  const ids = new Set<string>();
  for (const m of matches) {
    if (m.fighterRedId) ids.add(m.fighterRedId);
    if (m.fighterBlueId) ids.add(m.fighterBlueId);
  }
  return ids;
}

function buildPlacementMap(
  matches: OrganizerBracketMatchVM[],
): Map<string, PlacementInfo> {
  const map = new Map<string, PlacementInfo>();
  for (const m of matches) {
    const matchLabel = formatMatchOrderFormal(m);
    if (m.fighterRedId) {
      map.set(m.fighterRedId, {
        matchLabel,
        opponentName: m.fighterBlueSnapshot?.name ?? "미배정",
      });
    }
    if (m.fighterBlueId) {
      map.set(m.fighterBlueId, {
        matchLabel,
        opponentName: m.fighterRedSnapshot?.name ?? "미배정",
      });
    }
  }
  return map;
}

function parseCandidateName(label: string): { name: string; gymName: string } {
  const parts = label.split(" · ");
  if (parts.length >= 2) {
    return { name: parts[0]!, gymName: parts.slice(1).join(" · ") };
  }
  return { name: label, gymName: "—" };
}

function hasIssue(option: OrganizerApprovedFighterOptionVM): boolean {
  return !option.isEligibleForBracket;
}

export function BracketApprovedCandidatesSection({
  options,
  matches,
}: {
  options: OrganizerApprovedFighterOptionVM[];
  matches: OrganizerBracketMatchVM[];
}) {
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [issuesOnly, setIssuesOnly] = useState(false);

  const placedIds = useMemo(
    () => collectPlacedFighterIds(matches),
    [matches],
  );
  const placementMap = useMemo(() => buildPlacementMap(matches), [matches]);

  const ineligiblePlacedCount = useMemo(() => {
    return options.filter(
      (o) => placedIds.has(o.fighterId) && !o.isEligibleForBracket,
    ).length;
  }, [options, placedIds]);

  const visible = useMemo(() => {
    let list = options;
    if (eligibleOnly) {
      list = list.filter((o) => o.isEligibleForBracket);
    }
    if (issuesOnly) {
      list = list.filter((o) => hasIssue(o));
    }
    return list;
  }, [options, eligibleOnly, issuesOnly]);

  return (
    <section className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">승인된 신청 선수 (대진 후보)</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            승인된 신청자는 모두 후보로 조회됩니다. 출전 확정 전 선수는
            경고로 표시되며, 이미 대진표에 배치된 선수는 자동 삭제되지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={eligibleOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setEligibleOnly((v) => !v)}
          >
            {eligibleOnly ? "출전 확정만 ✓" : "출전 확정만 보기"}
          </Button>
          <Button
            type="button"
            variant={issuesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setIssuesOnly((v) => !v)}
          >
            {issuesOnly ? "문제 선수만 ✓" : "문제 있는 선수만 보기"}
          </Button>
        </div>
      </div>

      {ineligiblePlacedCount > 0 ? (
        <div className="mt-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            대진표에 배치된 선수 중 현장 확인이 끝나지 않은 선수가{" "}
            {ineligiblePlacedCount}명 있습니다.
          </p>
          <p className="text-amber-900/90 mt-1 text-xs dark:text-amber-100/90">
            현장·계체 결과는 경기 당일 패 처리 또는 진행 여부에 반영할 수
            있습니다.
          </p>
        </div>
      ) : null}

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {visible.map((o) => {
          const { name, gymName } = parseCandidateName(o.label);
          const placement = placementMap.get(o.fighterId);
          const isPlaced = placedIds.has(o.fighterId);

          return (
            <li
              key={o.applicationId}
              className={cn(
                "flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-sm",
                !o.isEligibleForBracket && "border-amber-500/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {gymName}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {o.divisionLabel}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <EligibilityBadge
                    label={o.eligibilityLabel}
                    isEligible={o.isEligibleForBracket}
                    title={o.eligibilityReason}
                  />
                  {isPlaced ? (
                    <StatusBadge variant="default" label="대진 배정됨" />
                  ) : (
                    <StatusBadge variant="outline" label="대진 미배정" />
                  )}
                </div>
              </div>

              <div className="text-muted-foreground border-t pt-2 text-xs">
                {placement ? (
                  <p>
                    <span className="text-foreground font-medium">
                      {placement.matchLabel} 배정
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
        })}
      </ul>
      {visible.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">
          {issuesOnly
            ? "문제가 있는 후보 선수가 없습니다."
            : eligibleOnly
              ? "출전 확정된 후보 선수가 없습니다."
              : "표시할 후보 선수가 없습니다."}
        </p>
      ) : null}
    </section>
  );
}
