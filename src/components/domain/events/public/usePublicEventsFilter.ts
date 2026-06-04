"use client";

import { useMemo, useState } from "react";
import type { PublicEventListItemDTO } from "@/lib/dto/public";

export type PublicEventsFilterKey =
  | "all"
  | "registration_open"
  | "registration_closed"
  | "upcoming"
  | "ended";

export const PUBLIC_EVENTS_FILTERS: {
  key: PublicEventsFilterKey;
  label: string;
}[] = [
  { key: "all", label: "전체" },
  { key: "registration_open", label: "신청 가능" },
  { key: "registration_closed", label: "신청 마감" },
  { key: "upcoming", label: "신청 전" },
  { key: "ended", label: "종료" },
];

function matchesFilter(
  event: PublicEventListItemDTO,
  filter: PublicEventsFilterKey,
): boolean {
  if (filter === "all") return true;
  if (filter === "registration_open") {
    return event.registrationStatus === "open";
  }
  if (filter === "registration_closed") {
    return (
      event.registrationStatus === "closed" || event.status === "closed"
    );
  }
  if (filter === "upcoming") {
    return event.registrationStatus === "before";
  }
  if (filter === "ended") {
    return event.status === "finished";
  }
  return true;
}

export function usePublicEventsFilter(events: PublicEventListItemDTO[]) {
  const [filter, setFilter] = useState<PublicEventsFilterKey>("all");
  const [sport, setSport] = useState<string>("all");
  const [regionQuery, setRegionQuery] = useState("");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (!matchesFilter(e, filter)) return false;
      if (sport !== "all" && e.primarySport !== sport) return false;
      if (regionQuery.trim()) {
        const q = regionQuery.trim().toLowerCase();
        const loc = (e.location ?? "").toLowerCase();
        if (!loc.includes(q)) return false;
      }
      return true;
    });
  }, [events, filter, sport, regionQuery]);

  return {
    filter,
    setFilter,
    sport,
    setSport,
    regionQuery,
    setRegionQuery,
    filtered,
  };
}
