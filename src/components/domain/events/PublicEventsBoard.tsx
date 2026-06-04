"use client";

import { useMemo, useState } from "react";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import { PublicEventCard } from "@/components/domain/events/PublicEventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

type FilterKey =
  | "all"
  | "registration_open"
  | "registration_closed"
  | "upcoming"
  | "ended";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "registration_open", label: "신청 가능" },
  { key: "registration_closed", label: "신청 마감" },
  { key: "upcoming", label: "신청 전" },
  { key: "ended", label: "종료" },
];

function matchesFilter(event: PublicEventListItemDTO, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "registration_open") {
    return event.registrationStatus === "open";
  }
  if (filter === "registration_closed") {
    return (
      event.registrationStatus === "closed" ||
      event.status === "closed"
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

export function PublicEventsBoard({
  events,
  sportOptions,
}: {
  events: PublicEventListItemDTO[];
  sportOptions: string[];
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">종목</span>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
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
              onChange={(e) => setRegionQuery(e.target.value)}
              placeholder="장소 키워드"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="조건에 맞는 대회가 없습니다"
          description="필터를 바꾸거나 전체 목록을 확인해 주세요."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((e, i) => (
            <PublicEventCard key={e.id} event={e} priorityImage={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
