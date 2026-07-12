"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** 우측 슬라이드 패널 형태의 상세 Drawer (Dialog 기반). */
export function DrawerPanel({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "fixed top-0 right-0 left-auto h-full max-h-none w-full max-w-md translate-x-0 translate-y-0 rounded-none rounded-l-xl border-l p-0 sm:max-w-md",
          "data-open:slide-in-from-right data-closed:slide-out-to-right",
          className,
        )}
      >
        <div className="flex h-full min-w-0 flex-col overflow-hidden">
          <DialogHeader className="shrink-0 border-b px-4 py-4">
            <DialogTitle className="break-words pr-8">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="break-words">
                {description}
              </DialogDescription>
            ) : null}
            {headerExtra ? (
              <div className="mt-2 flex flex-wrap gap-1.5">{headerExtra}</div>
            ) : null}
          </DialogHeader>
          <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
