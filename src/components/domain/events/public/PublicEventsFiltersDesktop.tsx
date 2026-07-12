"use client";

import {
  PUBLIC_EVENTS_FILTERS,
  type PublicEventsFilterKey,
} from "@/components/domain/events/public/usePublicEventsFilter";
import { Card, CardContent } from "@/components/ui/card";
import { eventListFieldInputClass, eventListFieldSelectClass } from "@/lib/ui/event-list-ui";
import { cn } from "@/lib/utils";

export function PublicEventsFiltersDesktop({
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
  return (
    <Card variant="muted" className="hidden gap-0 py-0 md:block">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {PUBLIC_EVENTS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={cn(
                "min-h-10 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">종목</span>
            <select
              value={sport}
              onChange={(e) => onSportChange(e.target.value)}
              className={cn(eventListFieldSelectClass, "h-10 min-w-[140px]")}
            >
              <option value="all">전체</option>
              {sportOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[200px] flex-1 space-y-1.5 text-sm">
            <span className="font-medium">지역</span>
            <input
              value={regionQuery}
              onChange={(e) => onRegionQueryChange(e.target.value)}
              placeholder="장소 키워드"
              className={cn(eventListFieldInputClass, "h-10 max-w-xs")}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
