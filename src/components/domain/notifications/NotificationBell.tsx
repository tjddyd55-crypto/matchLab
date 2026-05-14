"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellIcon } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NotificationBadge } from "@/components/domain/notifications/NotificationBadge";
import { NotificationList } from "@/components/domain/notifications/NotificationList";
import { useNotificationRealtime } from "@/features/realtime/useNotificationRealtime";
import { queryKeys } from "@/lib/query-keys";
import type { NotificationListItemDTO } from "@/lib/services/notification.service";
import { cn } from "@/lib/utils";

type NotificationsPayload = {
  items: NotificationListItemDTO[];
  unreadCount: number;
};

async function fetchNotifications(): Promise<NotificationsPayload> {
  const res = await fetch("/api/notifications", { credentials: "include" });
  const json = (await res.json()) as {
    ok: boolean;
    data?: NotificationsPayload;
    error?: { message?: string };
  };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error?.message ?? "알림을 불러오지 못했습니다.");
  }
  return json.data;
}

export function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();

  useNotificationRealtime({ userId, enabled: Boolean(userId) });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications.byUser(userId),
    queryFn: fetchNotifications,
    enabled: Boolean(userId),
    staleTime: 15_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationId }),
      });
      if (!res.ok) throw new Error("읽음 처리에 실패했습니다.");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.byUser(userId) });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("전체 읽음 처리에 실패했습니다.");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.byUser(userId) });
    },
  });

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "relative",
            )}
            aria-label="알림 열기"
          >
            <BellIcon className="size-4" />
            <NotificationBadge count={unread} />
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-start justify-between gap-2">
          <DialogTitle>알림</DialogTitle>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={markAllMutation.isPending || unread === 0}
              onClick={() => markAllMutation.mutate()}
            >
              모두 읽음
            </Button>
            <Link
              href="/notifications"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              전체
            </Link>
          </div>
        </DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground py-6 text-center text-sm">불러오는 중…</p>
        ) : (
          <NotificationList
            items={items.slice(0, 12)}
            onMarkRead={(id) => markReadMutation.mutate(id)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
