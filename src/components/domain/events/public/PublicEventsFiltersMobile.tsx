"use client";

import { useState } from "react";
import {
  PUBLIC_EVENTS_FILTERS,
  type PublicEventsFilterKey,
} from "@/components/domain/events/public/usePublicEventsFilter";
import { Card, CardContent } from "@/components/ui/card";
import { eventListFieldInputClass, eventListFieldSelectClass } from "@/lib/ui/event-list-ui";
import {
  matchonScrollablePillItemClass,
  matchonScrollablePillsClass,
} from "@/lib/ui/matchon-layout";
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
    <Card variant="muted" className="gap-0 py-0 md:hidden">
      <CardContent className="space-y-3 p-3">
        <div className={cn(matchonScrollablePillsClass, "-mx-1 px-1")}>
          <div className="flex w-max min-w-full gap-2">
            {PUBLIC_EVENTS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                className={cn(
                  matchonScrollablePillItemClass,
                  "min-h-10 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
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
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">종목</span>
              <select
                value={sport}
                onChange={(e) => onSportChange(e.target.value)}
                className={cn(eventListFieldSelectClass, "h-10")}
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
              <span className="font-medium">지역</span>
              <input
                value={regionQuery}
                onChange={(e) => onRegionQueryChange(e.target.value)}
                placeholder="장소 키워드"
                className={cn(eventListFieldInputClass, "h-10")}
              />
            </label>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
