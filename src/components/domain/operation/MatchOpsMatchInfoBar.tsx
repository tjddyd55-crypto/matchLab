"use client";

import { MatchOperationalSettingsSelect } from "@/components/domain/brackets/MatchOperationalSettingsSelect";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import {
  formatOperationalSettingsLabel,
  getEffectiveMatchRules,
} from "@/lib/match-operational-settings";
import { BRACKET_MATCH_STATUS_LABELS } from "@/lib/ui/match-status-ui";
import type { BracketMatchStatus } from "@/lib/enums";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import { cn } from "@/lib/utils";

export function MatchOpsMatchInfoBar({
  orderLabel,
  division,
  divisionLabel,
  courtName,
  status,
  fighterRedName,
  fighterBlueName,
  matchId,
  resultMemo,
  readOnlyRules = false,
  className,
}: {
  orderLabel: string;
  division: EventDivisionDisplayInput | null;
  divisionLabel: string | null;
  courtName: string | null;
  status: BracketMatchStatus;
  fighterRedName: string;
  fighterBlueName: string;
  matchId: string;
  resultMemo: string | null;
  readOnlyRules?: boolean;
  className?: string;
}) {
  const rules = getEffectiveMatchRules({ resultMemo });
  const rulesLabel = formatOperationalSettingsLabel(rules);

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/10 px-3 py-2.5 space-y-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-bold leading-tight text-[#0F172A]">
            {orderLabel}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[#64748B]">
            {courtName ? <span>{courtName}</span> : null}
            {courtName && (division || divisionLabel) ? (
              <span aria-hidden>·</span>
            ) : null}
            {division ? (
              <DivisionCompactDisplay
                division={division}
                mainClassName="text-[11px] font-medium text-[#64748B]"
                secondaryClassName="text-[10px]"
              />
            ) : divisionLabel ? (
              <span className="font-medium">{divisionLabel}</span>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-md border bg-background px-2 py-0.5 text-[10px] font-medium text-[#334155]">
          {BRACKET_MATCH_STATUS_LABELS[status]}
        </span>
      </div>

      <div className="grid gap-1 text-[11px] leading-snug sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">홍코너 </span>
          <span className="font-medium text-[#0F172A]">{fighterRedName}</span>
        </p>
        <p>
          <span className="text-muted-foreground">청코너 </span>
          <span className="font-medium text-[#0F172A]">{fighterBlueName}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
        <p className="text-[11px] font-semibold text-[#0F172A]">
          경기 규칙{" "}
          <span className="font-normal text-[#64748B]">{rulesLabel}</span>
        </p>
        {!readOnlyRules ? (
          <MatchOperationalSettingsSelect
            matchId={matchId}
            resultMemo={resultMemo}
            inline
            hideLabels
          />
        ) : null}
      </div>
    </div>
  );
}
