"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import { REALTIME_TABLES, useSupabaseRealtime } from "@/features/realtime/useSupabaseRealtime";

export function useNotificationRealtime(opts: {
  userId: string;
  enabled?: boolean;
  /** RSC 기반 알림 목록 등과 함께 쓸 때 soft refresh */
  refreshRouter?: boolean;
}): void {
  const qc = useQueryClient();
  const router = useRouter();

  useSupabaseRealtime({
    channelName: `notifications:${opts.userId}`,
    enabled: opts.enabled ?? Boolean(opts.userId),
    subscriptions: [
      {
        table: REALTIME_TABLES.Notification,
        filter: `userId=eq.${opts.userId}`,
      },
    ],
    onPayload: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.notifications.byUser(opts.userId),
      });
      if (opts.refreshRouter) router.refresh();
    },
  });
}
