"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  REALTIME_TABLES,
  type SupabaseRealtimeSubscription,
  useSupabaseRealtime,
} from "@/features/realtime/useSupabaseRealtime";

/** 공개 결과(RSC) — MatchResult·BracketMatch 변경 시 새로고침 */
export function PublicResultsRealtimeBridge({
  eventId,
  slug,
  bracketIds,
}: {
  eventId: string;
  slug: string;
  bracketIds: readonly string[];
}) {
  const router = useRouter();
  const bracketIdsSerialized = bracketIds.join(",");

  const subscriptions = useMemo((): SupabaseRealtimeSubscription[] => {
    const list: SupabaseRealtimeSubscription[] = [
      {
        table: REALTIME_TABLES.MatchResult,
        filter: `eventId=eq.${eventId}`,
      },
    ];
    if (bracketIdsSerialized.length > 0) {
      list.push({
        table: REALTIME_TABLES.BracketMatch,
        filter: `bracketId=in.(${bracketIdsSerialized})`,
      });
    }
    return list;
  }, [eventId, bracketIdsSerialized]);

  useSupabaseRealtime({
    channelName: `public-results:${slug}`,
    subscriptions,
    onPayload: () => router.refresh(),
  });

  return null;
}
