"use client";

import {
  PUBLIC_EVENTS_FILTERS,
  type PublicEventsFilterKey,
} from "@/components/domain/events/public/usePublicEventsFilter";
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
    <div className="hidden flex-col gap-4 rounded-lg border bg-muted/20 p-4 md:flex">
      <div className="flex flex-wrap items-center gap-2">
        {PUBLIC_EVENTS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
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
        <label className="space-y-1 text-sm">
          <span className="font-medium">종목</span>
          <select
            value={sport}
            onChange={(e) => onSportChange(e.target.value)}
            className="border-input bg-background h-9 min-w-[140px] rounded-md border px-2 text-sm"
          >
            <option value="all">전체</option>
            {sportOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[200px] flex-1 space-y-1 text-sm">
          <span className="font-medium">지역</span>
          <input
            value={regionQuery}
            onChange={(e) => onRegionQueryChange(e.target.value)}
            placeholder="장소 키워드"
            className="border-input bg-background h-9 w-full max-w-xs rounded-md border px-3 text-sm"
          />
        </label>
      </div>
    </div>
  );
}
