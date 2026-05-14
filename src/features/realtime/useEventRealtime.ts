"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  REALTIME_TABLES,
  type SupabaseRealtimeSubscription,
  useSupabaseRealtime,
} from "@/features/realtime/useSupabaseRealtime";

function bracketMatchFilter(bracketIds: string[]): SupabaseRealtimeSubscription[] {
  if (bracketIds.length === 0) return [];
  const filter = `bracketId=in.(${bracketIds.join(",")})`;
  return [{ table: REALTIME_TABLES.BracketMatch, filter }];
}

/** 신청·대진·경기·결과·라이브 스트림 메타 동기화 (대회 단위). BracketMatch는 bracketId 목록이 있을 때만 구독한다. */
export function useEventRealtime(opts: {
  eventId: string;
  slug?: string;
  bracketIds: readonly string[];
  organizerId?: string | null;
  enabled?: boolean;
}): void {
  const qc = useQueryClient();

  const bracketIds = [...opts.bracketIds];

  const subscriptions: SupabaseRealtimeSubscription[] = [
    {
      table: REALTIME_TABLES.EventApplication,
      filter: `eventId=eq.${opts.eventId}`,
    },
    {
      table: REALTIME_TABLES.Bracket,
      filter: `eventId=eq.${opts.eventId}`,
    },
    {
      table: REALTIME_TABLES.MatchResult,
      filter: `eventId=eq.${opts.eventId}`,
    },
    {
      table: REALTIME_TABLES.EventLiveStream,
      filter: `eventId=eq.${opts.eventId}`,
    },
    ...bracketMatchFilter(bracketIds),
  ];

  useSupabaseRealtime({
    channelName: `event-scope:${opts.eventId}`,
    enabled: opts.enabled ?? Boolean(opts.eventId),
    subscriptions,
    onPayload: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.applications.byEvent(opts.eventId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.brackets.byEvent(opts.eventId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.matches.byEvent(opts.eventId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.results.byEvent(opts.eventId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.liveStreams.byEvent(opts.eventId),
      });
      if (opts.slug) {
        qc.invalidateQueries({
          queryKey: queryKeys.brackets.publicBySlug(opts.slug),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.results.publicBySlug(opts.slug),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.liveStreams.publicBySlug(opts.slug),
        });
      }
      if (opts.organizerId) {
        qc.invalidateQueries({
          queryKey: queryKeys.events.dashboardCounts(opts.organizerId),
        });
      }
    },
  });
}
