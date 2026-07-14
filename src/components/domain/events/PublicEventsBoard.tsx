"use client";

import type { PublicEventListItemDTO } from "@/lib/dto/public";
import { EventListEmptyState } from "@/components/domain/events/EventListEmptyState";
import { PublicEventsFiltersDesktop } from "@/components/domain/events/public/PublicEventsFiltersDesktop";
import { PublicEventsFiltersMobile } from "@/components/domain/events/public/PublicEventsFiltersMobile";
import { PublicEventListDesktop } from "@/components/domain/events/public/PublicEventListDesktop";
import { PublicEventListMobile } from "@/components/domain/events/public/PublicEventListMobile";
import { usePublicEventsFilter } from "@/components/domain/events/public/usePublicEventsFilter";

export function PublicEventsBoard({
  events,
  sportOptions,
}: {
  events: PublicEventListItemDTO[];
  sportOptions: string[];
}) {
  const {
    filter,
    setFilter,
    sport,
    setSport,
    regionQuery,
    setRegionQuery,
    filtered,
  } = usePublicEventsFilter(events);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <PublicEventsFiltersDesktop
        filter={filter}
        onFilterChange={setFilter}
        sport={sport}
        onSportChange={setSport}
        regionQuery={regionQuery}
        onRegionQueryChange={setRegionQuery}
        sportOptions={sportOptions}
      />
      <PublicEventsFiltersMobile
        filter={filter}
        onFilterChange={setFilter}
        sport={sport}
        onSportChange={setSport}
        regionQuery={regionQuery}
        onRegionQueryChange={setRegionQuery}
        sportOptions={sportOptions}
      />

      {events.length === 0 ? (
        <EventListEmptyState
          title="현재 공개된 대회가 없습니다"
          description="주최자가 대회를 공개하면 여기에 표시됩니다."
        />
      ) : filtered.length === 0 ? (
        <EventListEmptyState
          title="조건에 맞는 대회가 없습니다"
          description="필터를 바꾸거나 전체 목록을 확인해 주세요."
        />
      ) : (
        <>
          <PublicEventListDesktop events={filtered} />
          <PublicEventListMobile events={filtered} />
        </>
      )}
    </div>
  );
}
