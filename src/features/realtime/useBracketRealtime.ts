"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  REALTIME_TABLES,
  useSupabaseRealtime,
} from "@/features/realtime/useSupabaseRealtime";

/** 특정 브래킷 편집 화면용 — 브래킷 행 + 해당 브래킷 매치. */
export function useBracketRealtime(opts: {
  eventId: string;
  bracketId: string;
  /** 공개 대진표 무효화용 */
  slug?: string;
  enabled?: boolean;
}): void {
  const qc = useQueryClient();

  useSupabaseRealtime({
    channelName: `bracket:${opts.bracketId}`,
    enabled: opts.enabled ?? Boolean(opts.bracketId),
    subscriptions: [
      {
        table: REALTIME_TABLES.Bracket,
        filter: `id=eq.${opts.bracketId}`,
      },
      {
        table: REALTIME_TABLES.BracketMatch,
        filter: `bracketId=eq.${opts.bracketId}`,
      },
    ],
    onPayload: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.brackets.byEvent(opts.eventId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.brackets.detail(opts.bracketId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.matches.byBracket(opts.bracketId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.matches.byEvent(opts.eventId),
      });
      if (opts.slug) {
        qc.invalidateQueries({
          queryKey: queryKeys.brackets.publicBySlug(opts.slug),
        });
      }
    },
  });
}
