"use client";

import { useState } from "react";
import { OrganizerJudgeAggregationInlineSection } from "@/components/domain/judges/OrganizerJudgeAggregationInlineSection";
import { cn } from "@/lib/utils";

const CORNER_LABEL: Record<string, string> = {
  red: "홍",
  blue: "청",
  draw: "무",
  no_contest: "NC",
  undecided: "—",
};

export function OperationJudgeBriefCell({
  matchId,
  items,
}: {
  matchId: string;
  items: { judgeName: string; winnerCorner: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {items.map((item, idx) => (
          <button
            key={`${item.judgeName}-${idx}`}
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "rounded-md border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary",
              "hover:bg-primary/10",
            )}
          >
            {idx + 1}심판 {CORNER_LABEL[item.winnerCorner] ?? item.winnerCorner}
          </button>
        ))}
      </div>
      {open ? (
        <div className="rounded-lg border bg-card p-2">
          <OrganizerJudgeAggregationInlineSection matchId={matchId} open />
        </div>
      ) : null}
    </div>
  );
}
