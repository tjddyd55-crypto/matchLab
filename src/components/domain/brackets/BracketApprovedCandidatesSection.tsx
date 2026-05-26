"use client";

import { useMemo, useState } from "react";
import type {
  OrganizerApprovedFighterOptionVM,
  OrganizerBracketMatchVM,
} from "@/lib/services/bracket.service";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";
import { Button } from "@/components/ui/button";

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

export function BracketApprovedCandidatesSection({
  options,
  matches,
}: {
  options: OrganizerApprovedFighterOptionVM[];
  matches: OrganizerBracketMatchVM[];
}) {
  const [eligibleOnly, setEligibleOnly] = useState(false);

  const placedIds = useMemo(
    () => collectPlacedFighterIds(matches),
    [matches],
  );

  const ineligiblePlaced = useMemo(() => {
    return options.filter(
      (o) => placedIds.has(o.fighterId) && !o.isEligibleForBracket,
    );
  }, [options, placedIds]);

  const visible = useMemo(() => {
    if (!eligibleOnly) return options;
    return options.filter((o) => o.isEligibleForBracket);
  }, [options, eligibleOnly]);

  return (
    <section className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">승인된 신청 선수 (대진 후보)</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            승인된 신청자는 모두 후보로 조회됩니다. 출전 확정되지 않은 선수는
            경고로 표시되며, 이미 대진표에 배치된 선수는 자동 삭제되지 않습니다.
          </p>
        </div>
        <Button
          type="button"
          variant={eligibleOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setEligibleOnly((v) => !v)}
        >
          {eligibleOnly ? "출전 확정만 보기 ✓" : "출전 확정만 보기"}
        </Button>
      </div>

      {ineligiblePlaced.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            대진표에 배치됐으나 출전 미확정인 선수
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {ineligiblePlaced.map((o) => (
              <li key={o.applicationId}>
                {o.label} — {o.eligibilityLabel} ({o.eligibilityReason})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {visible.map((o) => (
          <li
            key={o.applicationId}
            className="bg-muted/25 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <div>
              <span className="font-medium">{o.label}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {o.divisionLabel}
              </span>
            </div>
            <EligibilityBadge
              label={o.eligibilityLabel}
              isEligible={o.isEligibleForBracket}
              title={o.eligibilityReason}
            />
          </li>
        ))}
      </ul>
      {visible.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">
          {eligibleOnly
            ? "출전 확정된 후보 선수가 없습니다."
            : "표시할 후보 선수가 없습니다."}
        </p>
      ) : null}
    </section>
  );
}
