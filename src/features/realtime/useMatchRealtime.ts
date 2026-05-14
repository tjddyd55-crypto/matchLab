"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import {
  REALTIME_TABLES,
  type SupabaseRealtimeSubscription,
  useSupabaseRealtime,
} from "@/features/realtime/useSupabaseRealtime";

function bracketMatchFilter(bracketIds: readonly string[]) {
  if (bracketIds.length === 0) return [] as SupabaseRealtimeSubscription[];
  return [
    {
      table: REALTIME_TABLES.BracketMatch,
      filter: `bracketId=in.(${bracketIds.join(",")})`,
    },
  ] satisfies SupabaseRealtimeSubscription[];
}

/** 경기 운영 보드 — 매치 행 + 확정 전적(MatchResult). BracketMatch는 bracketIds 가 있을 때만 구독. */
export function useMatchRealtime(opts: {
  eventId: string;
  bracketIds: readonly string[];
  slug?: string;
  /** organizer 홈 카운트(RSC) 무효화 보조 */
  organizerId?: string | null;
  enabled?: boolean;
}): void {
  const qc = useQueryClient();
  const router = useRouter();

  const subscriptions: SupabaseRealtimeSubscription[] = [
    {
      table: REALTIME_TABLES.MatchResult,
      filter: `eventId=eq.${opts.eventId}`,
    },
    ...bracketMatchFilter(opts.bracketIds),
  ];

  useSupabaseRealtime({
    channelName: `match-scope:${opts.eventId}`,
    enabled: opts.enabled ?? Boolean(opts.eventId),
    subscriptions,
    onPayload: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.matches.byEvent(opts.eventId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.results.byEvent(opts.eventId),
      });
      if (opts.slug) {
        qc.invalidateQueries({
          queryKey: queryKeys.results.publicBySlug(opts.slug),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.brackets.publicBySlug(opts.slug),
        });
      }

      for (const bid of opts.bracketIds) {
        qc.invalidateQueries({ queryKey: queryKeys.matches.byBracket(bid) });
      }

      if (opts.organizerId) {
        qc.invalidateQueries({
          queryKey: queryKeys.events.dashboardCounts(opts.organizerId),
        });
      }

      router.refresh();
    },
  });
}
