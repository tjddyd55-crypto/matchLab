"use client";

import {
  PUBLIC_EVENTS_FILTERS,
  type PublicEventsFilterKey,
} from "@/components/domain/events/public/usePublicEventsFilter";
import {
  publicEventFilterBarClass,
  publicEventFilterControlLabelClass,
  publicEventFilterPillActiveClass,
  publicEventFilterPillBaseClass,
  publicEventFilterPillInactiveClass,
  publicEventFilterRegionInputClass,
  publicEventFilterSportSelectClass,
} from "@/components/domain/events/public/public-event-ui";
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
  return (
    <div className={cn(publicEventFilterBarClass, "md:hidden")}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
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

        <label className="flex w-full min-w-0 flex-col">
          <span className={publicEventFilterControlLabelClass}>종목</span>
          <select
            value={sport}
            onChange={(e) => onSportChange(e.target.value)}
            className={cn(publicEventFilterSportSelectClass, "w-full")}
          >
            <option value="all">전체</option>
            {sportOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex w-full min-w-0 flex-col">
          <span className={publicEventFilterControlLabelClass}>
            지역 / 장소 키워드
          </span>
          <input
            value={regionQuery}
            onChange={(e) => onRegionQueryChange(e.target.value)}
            placeholder="지역 또는 장소 검색"
            className={cn(publicEventFilterRegionInputClass, "max-w-none w-full")}
          />
        </label>
      </div>
    </div>
  );
}
