"use client";

import { useState } from "react";
import {
  PUBLIC_EVENTS_FILTERS,
  type PublicEventsFilterKey,
} from "@/components/domain/events/public/usePublicEventsFilter";
import { cn } from "@/lib/utils";

export function PublicEventsFiltersMobile({
  filter,
  onFilterChange,
  sport,
  onSportChange,
  regionQuery,
  onRegionQueryChange,
  sportOptions,
}: {
  filter: PublicEventsFilterKey;
  onFilterChange: (key: PublicEventsFilterKey) => void;
  sport: string;
  onSportChange: (value: string) => void;
  regionQuery: string;
  onRegionQueryChange: (value: string) => void;
  sportOptions: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3 md:hidden">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex w-max min-w-full gap-2">
          {PUBLIC_EVENTS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="text-muted-foreground text-xs font-medium underline-offset-2 hover:underline"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "상세 필터 접기" : "종목·지역 필터"}
      </button>
      {expanded ? (
        <div className="grid gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">종목</span>
            <select
              value={sport}
              onChange={(e) => onSportChange(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
            >
              <option value="all">전체</option>
              {sportOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">지역</span>
            <input
              value={regionQuery}
              onChange={(e) => onRegionQueryChange(e.target.value)}
              placeholder="장소 키워드"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
