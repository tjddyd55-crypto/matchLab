"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NotificationList } from "@/components/domain/notifications/NotificationList";
import { useNotificationRealtime } from "@/features/realtime/useNotificationRealtime";
import type { NotificationListItemDTO } from "@/lib/services/notification.service";

export function NotificationsPageClient(props: {
  userId: string;
  initialItems: NotificationListItemDTO[];
  initialUnread: number;
}) {
  const router = useRouter();

  useNotificationRealtime({
    userId: props.userId,
    enabled: Boolean(props.userId),
    refreshRouter: true,
  });

  const markOne = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationId }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => router.refresh(),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          읽지 않음 {props.initialUnread}건
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={markAll.isPending || props.initialUnread === 0}
          onClick={() => markAll.mutate()}
        >
          모두 읽음
        </Button>
      </div>
      <NotificationList
        items={props.initialItems}
        onMarkRead={(id) => markOne.mutate(id)}
      />
    </div>
  );
}
