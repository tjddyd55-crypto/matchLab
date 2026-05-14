"use client";

import { cn } from "@/lib/utils";

export function NotificationBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={cn(
        "bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium",
        className,
      )}
      aria-label={`읽지 않은 알림 ${count}건`}
    >
      {label}
    </span>
  );
}
