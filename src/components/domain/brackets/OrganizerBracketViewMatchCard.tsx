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
  isCurrentFighter,
}: {
  corner: "홍코너" | "청코너";
  name: string;
  gymName: string | null;
  handicap: OrganizerEventMatchFighterVM["handicap"];
  isWinner: boolean;
  isCurrentFighter?: boolean;
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
        isCurrentFighter && "ring-1 ring-[#0A47FF]/50 bg-[#EAF1FF]/60",
      )}
    >
      {isCurrentFighter ? (
        <span className="text-[10px] font-semibold text-[#0A47FF]">현재 선수</span>
      ) : null}
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
  highlightFighterId,
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
  /** 현장·계체 등 — 선택 참가자 코너 강조 */
  highlightFighterId?: string | null;
}) {
  return (
    <div
      className={cn(
        organizerBracketVsCardClass,
        "overflow-hidden rounded-[10px] border-[#E2E8F0] p-0 shadow-none",
      )}
    >
      <div className="space-y-1.5 border-b border-[#E2E8F0] bg-matchon-primary-light/20 px-3 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-bold tabular-nums text-[#0F172A]">
              {matchOrderLabel}
            </p>
            {bracketTitle ? (
              <p className="truncate text-xs text-[#64748B]">{bracketTitle}</p>
            ) : null}
            {divisionLabel ? (
              <p className="truncate text-xs text-[#64748B]">{divisionLabel}</p>
            ) : null}
            {courtName ? (
              <p className="text-xs text-[#64748B]">{courtName}</p>
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
          <p className="text-xs font-medium text-[#64748B]">{opsLabel}</p>
        ) : null}
      </div>

      <div className="space-y-2.5 px-3 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <FighterCell
            corner="홍코너"
            name={fighterRedName}
            gymName={fighterRedGym}
            handicap={fighterRedHandicap}
            isWinner={Boolean(winnerId && fighterRedId && winnerId === fighterRedId)}
            isCurrentFighter={Boolean(
              highlightFighterId && fighterRedId && highlightFighterId === fighterRedId,
            )}
          />
          <div className="flex flex-col items-center justify-center px-1 text-sm font-black text-[#64748B]">
            VS
          </div>
          <FighterCell
            corner="청코너"
            name={fighterBlueName}
            gymName={fighterBlueGym}
            handicap={fighterBlueHandicap}
            isWinner={Boolean(winnerId && fighterBlueId && winnerId === fighterBlueId)}
            isCurrentFighter={Boolean(
              highlightFighterId && fighterBlueId && highlightFighterId === fighterBlueId,
            )}
          />
        </div>

        {controls ? (
          <div className="space-y-2 border-t border-[#E2E8F0] pt-2.5">
            {controls}
          </div>
        ) : null}
      </div>
    </div>
  );
}
