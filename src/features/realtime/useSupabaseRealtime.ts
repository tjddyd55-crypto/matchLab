"use client";

import { useEffect, useMemo, useRef, useId } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Supabase Realtime `postgres_changes` 테이블 이름은 Prisma 기본 매핑(모델명=테이블명) 기준이다.
 * 실제 DB가 다르면 `docs/dev-start.md`의 publication 설정과 함께 수정한다.
 */
export const REALTIME_TABLES = {
  EventApplication: "EventApplication",
  EventApplicationPayment: "EventApplicationPayment",
  Bracket: "Bracket",
  BracketMatch: "BracketMatch",
  MatchResult: "MatchResult",
  EventLiveStream: "EventLiveStream",
  Notification: "Notification",
} as const;

export type SupabaseRealtimeSubscription = {
  /** postgres Changes 이벤트 */
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
  table: string;
  /** 예: `eventId=eq.xxx` — 컬럼명은 Prisma 필드명과 동일해야 한다 */
  filter?: string;
};

export function useSupabaseRealtime(opts: {
  channelName: string;
  subscriptions: SupabaseRealtimeSubscription[];
  enabled?: boolean;
  onPayload: () => void;
}): void {
  const onPayloadRef = useRef(opts.onPayload);

  useEffect(() => {
    onPayloadRef.current = opts.onPayload;
  }, [opts.onPayload]);

  const subsKey = useMemo(
    () => JSON.stringify(opts.subscriptions),
    [opts.subscriptions],
  );

  const instanceSuffix = useId().replace(/:/g, "");
  const channelName = useMemo(
    () => `${opts.channelName}:${instanceSuffix}`,
    [opts.channelName, instanceSuffix],
  );

  useEffect(() => {
    if (opts.enabled === false || opts.subscriptions.length === 0) return;

    const client = createSupabaseBrowserClient();
    const ch = client.channel(channelName);

    for (const sub of opts.subscriptions) {
      ch.on(
        "postgres_changes",
        {
          event: sub.event ?? "*",
          schema: sub.schema ?? "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        () => {
          onPayloadRef.current();
        },
      );
    }

    ch.subscribe();

    return () => {
      client.removeChannel(ch);
    };
  }, [channelName, opts.enabled, subsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- 구독 내용은 subsKey(JSON)와 동기
}
