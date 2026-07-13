"use client";

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
    <div className={cn(publicEventFilterBarClass, "hidden md:block")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {PUBLIC_EVENTS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={cn(
                publicEventFilterPillBaseClass,
                filter === f.key
                  ? publicEventFilterPillActiveClass
                  : publicEventFilterPillInactiveClass,
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="space-y-1.5 text-sm">
            <span className="font-semibold text-matchon-text-primary">종목</span>
            <select
              value={sport}
              onChange={(e) => onSportChange(e.target.value)}
              className={cn(matchonFieldSelectClass, "min-w-[140px]")}
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
            <span className="font-semibold text-matchon-text-primary">지역</span>
            <input
              value={regionQuery}
              onChange={(e) => onRegionQueryChange(e.target.value)}
              placeholder="장소 키워드"
              className={cn(matchonFieldInputClass, "max-w-xs")}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
