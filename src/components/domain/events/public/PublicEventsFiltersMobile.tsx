"use client";

import { useState } from "react";
import {
  PUBLIC_EVENTS_FILTERS,
  type PublicEventsFilterKey,
} from "@/components/domain/events/public/usePublicEventsFilter";
import {
  publicEventFilterBarClass,
  publicEventFilterPillActiveClass,
  publicEventFilterPillBaseClass,
  publicEventFilterPillInactiveClass,
} from "@/components/domain/events/public/public-event-ui";
import {
  matchonFieldInputClass,
  matchonFieldSelectClass,
} from "@/lib/ui/matchon-shell-ui";
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
    <div className={cn(publicEventFilterBarClass, "md:hidden")}>
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full gap-2">
            {PUBLIC_EVENTS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                className={cn(
                  publicEventFilterPillBaseClass,
                  "text-xs whitespace-nowrap",
                  filter === f.key
                    ? publicEventFilterPillActiveClass
                    : publicEventFilterPillInactiveClass,
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="text-xs font-semibold text-matchon-primary underline-offset-2 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "상세 필터 접기" : "종목·지역 필터"}
        </button>
        {expanded ? (
          <div className="grid gap-3">
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-matchon-text-primary">종목</span>
              <select
                value={sport}
                onChange={(e) => onSportChange(e.target.value)}
                className={matchonFieldSelectClass}
              >
                <option value="all">전체</option>
                {sportOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-matchon-text-primary">지역</span>
              <input
                value={regionQuery}
                onChange={(e) => onRegionQueryChange(e.target.value)}
                placeholder="장소 키워드"
                className={matchonFieldInputClass}
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
