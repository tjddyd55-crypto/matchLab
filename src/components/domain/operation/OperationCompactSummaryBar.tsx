"use client";

import type { OperationBoardFilter, OperationBoardSummary } from "@/lib/match-operation-display";
import {
  organizerOperationCompactSummaryClass,
  organizerOperationSummaryPillActiveClass,
  organizerOperationSummaryPillBaseClass,
} from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";

const SUMMARY_ITEMS: {
  filter: OperationBoardFilter;
  label: string;
  key: keyof OperationBoardSummary;
}[] = [
  { filter: "all", label: "전체", key: "total" },
  { filter: "scheduled", label: "대기", key: "scheduled" },
  { filter: "preparing", label: "준비", key: "preparing" },
  { filter: "in_progress", label: "진행", key: "inProgress" },
  { filter: "completed", label: "종료", key: "completed" },
  { filter: "result_pending", label: "결과 미입력", key: "resultPending" },
  { filter: "result_done", label: "결과 입력", key: "resultDone" },
];

export function OperationCompactSummaryBar({
  summary,
  activeFilter,
  onFilterChange,
}: {
  summary: OperationBoardSummary;
  activeFilter: OperationBoardFilter;
  onFilterChange: (filter: OperationBoardFilter) => void;
}) {
  return (
    <div className={organizerOperationCompactSummaryClass}>
      {SUMMARY_ITEMS.map((item) => {
        const active = activeFilter === item.filter;
        return (
          <button
            key={item.filter}
            type="button"
            onClick={() => onFilterChange(item.filter)}
            className={cn(
              organizerOperationSummaryPillBaseClass,
              active && organizerOperationSummaryPillActiveClass,
            )}
          >
            <span className="text-matchon-text-secondary">{item.label}</span>
            <span className="font-bold tabular-nums text-matchon-text-primary">
              {summary[item.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
