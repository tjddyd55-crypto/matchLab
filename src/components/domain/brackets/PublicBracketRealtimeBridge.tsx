"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  REALTIME_TABLES,
  type SupabaseRealtimeSubscription,
  useSupabaseRealtime,
} from "@/features/realtime/useSupabaseRealtime";

/** 공개 대진표(RSC) — 이벤트 수신 시 `router.refresh` 로 서버 데이터 재조회 */
export function PublicBracketRealtimeBridge({
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
        table: REALTIME_TABLES.Bracket,
        filter: `eventId=eq.${eventId}`,
      },
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
    channelName: `public-brackets:${slug}`,
    subscriptions,
    onPayload: () => router.refresh(),
  });

  return null;
}
