"use client";

import type { ReactNode } from "react";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BracketFighterCompactCard } from "@/components/domain/brackets/BracketFighterCompactCard";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";
import type { OrganizerEventMatchFighterVM } from "@/lib/services/match.service";
import { BracketMatchStatus } from "@/lib/enums";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
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
  const style = CORNER_SLOT_STYLES[corner];
  const empty = !name?.trim() || name === "-";

  return (
    <div
      className={cn(
        "rounded-md border p-3",
        style.bg,
        isWinner && "ring-2 ring-emerald-600/60",
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
    <Card variant="interactive" className="overflow-hidden py-0">
      <CardHeader className="space-y-2 border-b bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold tabular-nums">{matchOrderLabel}</p>
            {bracketTitle ? (
              <p className="text-muted-foreground truncate text-xs">{bracketTitle}</p>
            ) : null}
            {divisionLabel ? (
              <p className="text-muted-foreground truncate text-xs">{divisionLabel}</p>
            ) : null}
            {courtName ? (
              <p className="text-muted-foreground text-xs">{courtName}</p>
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
          <p className="text-muted-foreground text-xs font-medium">{opsLabel}</p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 px-4 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <FighterCell
            corner="홍코너"
            name={fighterRedName}
            gymName={fighterRedGym}
            handicap={fighterRedHandicap}
            isWinner={Boolean(winnerId && fighterRedId && winnerId === fighterRedId)}
          />
          <div className="text-muted-foreground flex flex-col items-center justify-center px-1 text-sm font-black">
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

        {controls ? <div className="space-y-2 border-t pt-3">{controls}</div> : null}
      </CardContent>
    </Card>
  );
}
