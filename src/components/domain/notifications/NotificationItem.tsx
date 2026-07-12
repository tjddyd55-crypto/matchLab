"use client";

import Link from "next/link";
import { formatPublicDateTime } from "@/lib/date-display";
import type { NotificationListItemDTO } from "@/lib/services/notification.service";
import { cn } from "@/lib/utils";

export function NotificationItem({
  item,
  onMarkRead,
}: {
  item: NotificationListItemDTO;
  onMarkRead: (id: string) => void;
}) {
  const unread = !item.readAt;

  const inner = (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left text-sm",
        unread ? "border-primary/25 bg-muted/40" : "border-transparent bg-muted/20",
      )}
    >
      <span className="font-medium">{item.title}</span>
      <span className="text-muted-foreground text-xs leading-snug">{item.content}</span>
      <span className="text-muted-foreground text-[11px]">
        {formatPublicDateTime(item.createdAt)}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      {item.href ? (
        <Link
          href={item.href}
          className="hover:bg-muted/60 rounded-md focus-visible:ring-ring outline-none focus-visible:ring-2"
          onClick={() => {
            if (unread) onMarkRead(item.id);
          }}
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          className="hover:bg-muted/60 cursor-pointer rounded-md text-left focus-visible:ring-ring outline-none focus-visible:ring-2"
          onClick={() => {
            if (unread) onMarkRead(item.id);
          }}
        >
          {inner}
        </button>
      )}
    </div>
  );
}
