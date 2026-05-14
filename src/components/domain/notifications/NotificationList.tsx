"use client";

import type { NotificationListItemDTO } from "@/lib/services/notification.service";
import { NotificationItem } from "@/components/domain/notifications/NotificationItem";

export function NotificationList({
  items,
  onMarkRead,
}: {
  items: NotificationListItemDTO[];
  onMarkRead: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        알림이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex max-h-[min(70vh,420px)] flex-col gap-2 overflow-y-auto py-1">
      {items.map((item) => (
        <li key={item.id}>
          <NotificationItem item={item} onMarkRead={onMarkRead} />
        </li>
      ))}
    </ul>
  );
}
