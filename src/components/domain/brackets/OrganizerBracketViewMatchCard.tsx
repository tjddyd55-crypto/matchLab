"use client";

import type { ReactNode } from "react";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { BracketFighterCompactCard } from "@/components/domain/brackets/BracketFighterCompactCard";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import type { OrganizerEventMatchFighterVM } from "@/lib/services/match.service";
import { BracketMatchStatus } from "@/lib/enums";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
import {
  organizerBracketBlueCornerPanelClass,
  organizerBracketRedCornerPanelClass,
  organizerBracketVsCardClass,
} from "@/lib/ui/organizer-bracket-ui";
import { cn } from "@/lib/utils";

function FighterCell({
  corner,
  name,
  gymName,
  handicap,
  isWinner,
}: {
  corner: "홍코너" | "청코너";
  name: string;
  gymName: string | null;
  handicap: OrganizerEventMatchFighterVM["handicap"];
  isWinner: boolean;
}) {
  const empty = !name?.trim() || name === "-";
  const panelClass =
    corner === "홍코너"
      ? organizerBracketRedCornerPanelClass
      : organizerBracketBlueCornerPanelClass;

  return (
    <div
      className={cn(
        panelClass,
        isWinner && "ring-2 ring-emerald-500/50",
      )}
    >
      <BracketFighterCompactCard
        centerIdentity={false}
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

export function OrganizerBracketViewMatchCard({
  matchOrderLabel,
  divisionLabel,
  bracketTitle,
  courtName,
  status,
  winnerId,
  fighterRedId,
  fighterRedName,
  fighterRedGym,
  fighterRedHandicap,
  fighterBlueId,
  fighterBlueName,
  fighterBlueGym,
  fighterBlueHandicap,
  headerBadges,
  opsLabel,
  controls,
}: {
  matchOrderLabel: string;
  divisionLabel?: string | null;
  bracketTitle?: string | null;
  courtName?: string | null;
  status: BracketMatchStatus;
  winnerId: string | null;
  fighterRedId: string | null;
  fighterRedName: string;
  fighterRedGym: string | null;
  fighterRedHandicap: OrganizerEventMatchFighterVM["handicap"];
  fighterBlueId: string | null;
  fighterBlueName: string;
  fighterBlueGym: string | null;
  fighterBlueHandicap: OrganizerEventMatchFighterVM["handicap"];
  headerBadges?: ReactNode;
  opsLabel?: string | null;
  controls?: ReactNode;
}) {
  return (
    <div className={cn(organizerBracketVsCardClass, "overflow-hidden p-0")}>
      <div className="space-y-2 border-b border-matchon-border bg-matchon-primary-light/20 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold tabular-nums text-matchon-text-primary">
              {matchOrderLabel}
            </p>
            {bracketTitle ? (
              <p className="text-matchon-text-secondary truncate text-xs">
                {bracketTitle}
              </p>
            ) : null}
            {divisionLabel ? (
              <p className="text-matchon-text-secondary truncate text-xs">
                {divisionLabel}
              </p>
            ) : null}
            {courtName ? (
              <p className="text-matchon-text-secondary text-xs">{courtName}</p>
            ) : null}
          </div>
          <MatchonStatusBadge
            status={resolveBracketMatchMatchonStatus(status)}
            label={getBracketMatchMatchonLabel(status)}
            size="sm"
          />
        </div>
        {headerBadges ? (
          <div className="flex flex-wrap items-center gap-1.5">{headerBadges}</div>
        ) : null}
        {opsLabel ? (
          <p className="text-matchon-text-secondary text-xs font-medium">
            {opsLabel}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <FighterCell
            corner="홍코너"
            name={fighterRedName}
            gymName={fighterRedGym}
            handicap={fighterRedHandicap}
            isWinner={Boolean(winnerId && fighterRedId && winnerId === fighterRedId)}
          />
          <div className="text-matchon-text-secondary flex flex-col items-center justify-center px-1 text-sm font-black">
            VS
          </div>
          <FighterCell
            corner="청코너"
            name={fighterBlueName}
            gymName={fighterBlueGym}
            handicap={fighterBlueHandicap}
            isWinner={Boolean(winnerId && fighterBlueId && winnerId === fighterBlueId)}
          />
        </div>

        {controls ? (
          <div className="space-y-2 border-t border-matchon-border pt-3">
            {controls}
          </div>
        ) : null}
      </div>
    </div>
  );
}
