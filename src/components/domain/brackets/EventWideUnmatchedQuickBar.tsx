"use client";

import { useMemo } from "react";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import {
  BracketFighterCompactBadge,
  BracketFighterCompactCard,
} from "@/components/domain/brackets/BracketFighterCompactCard";
import {
  UnmatchedDraggableCardShell,
  type ManualMatchPickSlot,
} from "@/components/domain/brackets/ManualMatchCreatePanel";
import { UnmatchedQuickBarFilterToolbar } from "@/components/domain/brackets/UnmatchedQuickBarFilterToolbar";
import { buildBracketCandidateWeightRecordDisplay } from "@/lib/bracket-fighter-assignment";
import { resolveCandidateStatusBadge } from "@/lib/bracket-fighter-compact-display";
import {
  filterUnmatchedQuickBarOptions,
  type UnmatchedQuickBarFilterState,
} from "@/lib/brackets/unmatched-candidate-filters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function candidateDivisionMeta(
  option: OrganizerApprovedFighterOptionVM,
): string | undefined {
  const label = option.isOtherDivision
    ? option.currentDivisionLabel
    : option.appliedDivisionLabel;
  return label || undefined;
}

export function EventWideUnmatchedQuickBar({
  options,
  filters,
  onFiltersChange,
  showToolbar = true,
  slotIds,
  activePickSlot,
  onCardClick,
  onAssignRed,
  onAssignBlue,
  onDragStart,
}: {
  options: OrganizerApprovedFighterOptionVM[];
  filters: UnmatchedQuickBarFilterState;
  onFiltersChange: (next: UnmatchedQuickBarFilterState) => void;
  showToolbar?: boolean;
  slotIds: Set<string>;
  activePickSlot: ManualMatchPickSlot | null;
  onCardClick: (option: OrganizerApprovedFighterOptionVM) => void;
  onAssignRed: (option: OrganizerApprovedFighterOptionVM) => void;
  onAssignBlue: (option: OrganizerApprovedFighterOptionVM) => void;
  onDragStart?: () => void;
}) {
  const filtered = useMemo(
    () => filterUnmatchedQuickBarOptions(options, filters),
    [filters, options],
  );

  return (
    <section className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <h3 className="text-sm font-semibold">
        미매칭 선수{" "}
        <span className="text-muted-foreground font-normal tabular-nums">
          {filtered.length}명
        </span>
      </h3>

      {showToolbar ? (
        <UnmatchedQuickBarFilterToolbar
          className="hidden lg:block"
          options={options}
          filters={filters}
          onFiltersChange={onFiltersChange}
          layout="toolbar"
        />
      ) : null}

      {activePickSlot ? (
        <p className="text-primary text-xs font-medium">
          {activePickSlot === "red" ? "홍코너" : "청코너"} 선택 중 — 아래 선수를
          클릭하세요
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded border border-dashed px-3 py-2 text-center text-xs">
          조건에 맞는 미매칭 선수가 없습니다.
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
